#!/usr/bin/env bash
# Why does a lodge site ({slug}.stayzim.co.zw) show "no available server"?
# Run on the VPS (Coolify → Servers → your server → Terminal, or SSH):
#
#   bash check-routing.sh                      # checks mistvalley.stayzim.co.zw
#   bash check-routing.sh lakeview stayzim.co.zw
#
# It only reads: versions, container labels, health and networks, Coolify's
# proxy settings and log, and two requests through Traefik on this machine.
# Nothing is changed. What each answer means (tested against Traefik v2.11
# and v3.6) is in docs/deployment.md#troubleshooting:
#   "no available server" (503)  a route matched, but Traefik's own health check
#                                marked every server of its service down
#   "404 page not found"         no route matched: labels missing, a rule this
#                                Traefik can't read, or web not healthy yet
#   "Gateway Timeout" (504)      Traefik can't reach web over the network it picked

set -u
SLUG="${1:-mistvalley}"
DOMAIN="${2:-stayzim.co.zw}"
HOST="$SLUG.$DOMAIN"
PROXY="${PROXY_CONTAINER:-coolify-proxy}"
problems=0

ok() { printf '  \033[32m✓\033[0m %s\n' "$1"; }
bad() { printf '  \033[31m✗\033[0m %s\n' "$1"; problems=$((problems + 1)); }
note() { printf '    %s\n' "$1"; }
title() { printf '\n\033[1m%s\033[0m\n' "$1"; }

if ! command -v docker >/dev/null 2>&1; then
  echo "docker isn't on this machine's PATH. Run this on the VPS that runs Coolify." >&2
  exit 1
fi

title "0. Versions"
docker_version=$(docker version --format '{{.Server.Version}}' 2>/dev/null)
note "Docker $docker_version"
if docker inspect "$PROXY" >/dev/null 2>&1; then
  proxy_image=$(docker inspect --format '{{.Config.Image}}' "$PROXY")
  proxy_args=$(docker inspect --format '{{join .Args " "}} {{join .Config.Cmd " "}}' "$PROXY")
  traefik_version=$(docker exec "$PROXY" traefik version 2>/dev/null | awk '/^Version/ {print $2}')
  note "$PROXY: $proxy_image, Traefik ${traefik_version:-unknown}"
  traefik_major=${traefik_version%%.*}
  traefik_minor=$(echo "$traefik_version" | cut -d. -f2)
  if docker logs --since 1h "$PROXY" 2>&1 | grep -q 'client version .* is too old'; then
    bad "Traefik ${traefik_version:-here} can't read the containers from Docker $docker_version (\"client version is too old\"), so nothing is routed."
    note "Fix: Coolify → Servers → your server → Proxy: update Traefik to v3.6 or newer, or set DOCKER_API_VERSION=1.44 on the proxy."
  fi
  case "$proxy_args" in *defaultRuleSyntax=v2*) syntax_v2=1 ;; *) syntax_v2=0 ;; esac
  [ "$syntax_v2" = 1 ] && note "The proxy reads rules in v2 syntax (core.defaultRuleSyntax=v2)."
  case "$proxy_args" in *allowEmptyServices=true*) note "The proxy keeps services with no healthy container (allowEmptyServices=true)." ;; esac
fi

title "1. Containers that route lodge sites (label traefik.http.routers.stayzim-sites.rule)"
mapfile -t SITES < <(docker ps -a --format '{{.ID}}' | while read -r id; do
  rule=$(docker inspect --format '{{index .Config.Labels "traefik.http.routers.stayzim-sites.rule"}}' "$id" 2>/dev/null)
  [ -n "$rule" ] && [ "$rule" != "<no value>" ] && echo "$id"
done)
if [ "${#SITES[@]}" -eq 0 ]; then
  bad "No container has the lodge-site route."
  note "Web isn't running from deploy/compose.yaml, or Coolify dropped the labels."
  note "Fix: deploy the compose resource, or copy the traefik.* labels of the web service"
  note "in deploy/compose.yaml into the web application's Container Labels."
else
  running=0
  for id in "${SITES[@]}"; do
    name=$(docker inspect --format '{{.Name}}' "$id" | sed 's#^/##')
    state=$(docker inspect --format '{{.State.Status}}' "$id")
    health=$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}no health check{{end}}' "$id")
    networks=$(docker inspect --format '{{range $name, $_ := .NetworkSettings.Networks}}{{$name}} {{end}}' "$id")
    note "$name: $state, $health; networks: $networks"
    rule=$(docker inspect --format '{{index .Config.Labels "traefik.http.routers.stayzim-sites.rule"}}' "$id")
    note "rule: $rule"
    case "$rule" in
      *HostRegexp*)
        if [ "${traefik_major:-3}" = 2 ] || [ "${syntax_v2:-0}" = 1 ]; then
          bad "$name's rule is a v3 HostRegexp, which this Traefik reads as v2 and never matches: lodge sites get a 404."
          note "Fix: redeploy from the current deploy/compose.yaml (the rule is now PathPrefix(\`/\`), the same in v2 and v3)."
        fi
        ;;
    esac
    [ "$state" = "running" ] && running=$((running + 1))
    if [ "$state" = "running" ] && [ "$health" != "healthy" ] && [ "$health" != "no health check" ]; then
      bad "$name is $health: Traefik leaves out containers that aren't healthy."
      note "Last health check output:"
      docker inspect --format '{{range .State.Health.Log}}{{.Output}}{{end}}' "$id" 2>/dev/null | tail -n 3 | sed 's/^/      /'
    fi
  done
  if [ "$running" -gt 1 ]; then
    bad "$running running containers carry the same route names (stayzim-sites)."
    note "Traefik merges or conflicts them, and the copy that wins may be the stale one."
    note "Keep one web resource and stop the others."
  elif [ "$running" -eq 1 ]; then
    ok "Exactly one running container carries the lodge-site route."
  else
    bad "The containers with the route aren't running."
  fi
fi

title "2. The proxy ($PROXY) and the web container share a network"
if ! docker inspect "$PROXY" >/dev/null 2>&1; then
  bad "No container named $PROXY. Set PROXY_CONTAINER=<name> and run again (docker ps | grep -i traefik)."
else
  proxy_networks=$(docker inspect --format '{{range $name, $_ := .NetworkSettings.Networks}}{{$name}} {{end}}' "$PROXY")
  note "$PROXY networks: $proxy_networks"
  for id in "${SITES[@]}"; do
    [ "$(docker inspect --format '{{.State.Status}}' "$id")" = "running" ] || continue
    name=$(docker inspect --format '{{.Name}}' "$id" | sed 's#^/##')
    web_networks=$(docker inspect --format '{{range $name, $_ := .NetworkSettings.Networks}}{{$name}} {{end}}' "$id")
    shared=""
    for network in $web_networks; do
      case " $proxy_networks " in *" $network "*) shared="$shared $network" ;; esac
    done
    pinned=$(docker inspect --format '{{index .Config.Labels "traefik.docker.network"}}' "$id")
    if [ -z "$shared" ]; then
      bad "$name shares no network with $PROXY, so Traefik can't reach it."
    else
      ok "$name shares:$shared"
      count=$(echo "$web_networks" | wc -w)
      if [ "$count" -gt 1 ] && { [ -z "$pinned" ] || [ "$pinned" = "<no value>" ]; }; then
        note "It's on $count networks and has no traefik.docker.network label: Traefik may pick"
        first=$(echo "$shared" | awk '{print $1}')
        note "one it can't reach. If the checks below fail, add traefik.docker.network=$first to web's labels."
      fi
    fi
  done
fi

title "3. Traefik health checks (the source of \"no available server\")"
found=0
while read -r id; do
  checks=$(docker inspect --format '{{range $key, $value := .Config.Labels}}{{$key}}={{$value}}{{"\n"}}{{end}}' "$id" | grep -i 'loadbalancer.healthcheck')
  if [ -n "$checks" ]; then
    found=1
    name=$(docker inspect --format '{{.Name}}' "$id" | sed 's#^/##')
    bad "$name has a Traefik health check. If it fails, every request to that service gets \"no available server\":"
    echo "$checks" | sed 's/^/      /'
  fi
done < <(docker ps -q)
for dir in /data/coolify/proxy/dynamic /data/coolify/proxy; do
  [ -d "$dir" ] || continue
  hits=$(grep -rliE 'healthCheck|stayzim' "$dir" --include='*.yaml' --include='*.yml' --include='*.toml' 2>/dev/null)
  if [ -n "$hits" ]; then
    found=1
    bad "Coolify's dynamic proxy configuration mentions stayzim or a health check; a route or health check there can override the labels:"
    echo "$hits" | sed 's/^/      /'
    note "Open them in Coolify → Servers → your server → Proxy → Dynamic Configurations, and remove any route for *.$DOMAIN."
  fi
  break
done
[ "$found" = 0 ] && ok "No Traefik health checks, and nothing about stayzim in Coolify's dynamic configuration."

title "4. Traefik's answer on this machine"
for name in "$DOMAIN" "$HOST"; do
  code=$(curl -sk --noproxy '*' -o /tmp/stayzim-route-check -w '%{http_code}' --max-time 15 --resolve "$name:443:127.0.0.1" "https://$name/")
  body=$(head -c 80 /tmp/stayzim-route-check 2>/dev/null | tr -d '\n')
  if [ "$code" = "200" ] || [ "$code" = "307" ] || [ "$code" = "308" ]; then
    ok "https://$name → $code"
  else
    bad "https://$name → $code ${body:+($body)}"
  fi
done
rm -f /tmp/stayzim-route-check

title "5. The proxy's recent complaints"
if docker inspect "$PROXY" >/dev/null 2>&1; then
  lines=$(docker logs --since 24h "$PROXY" 2>&1 | grep -iE 'stayzim-sites|no available server|unable to find|could not find network|defined multiple times|client version|health' | tail -n 15)
  if [ -n "$lines" ]; then
    echo "$lines" | sed 's/^/    /'
  else
    ok "Nothing about these routes in the last 24 hours."
  fi
fi

title "Result"
if [ "$problems" -eq 0 ]; then
  ok "No problems found. If a browser still shows the error, purge Cloudflare's cache and try a private window."
else
  echo "  $problems problem(s) above. Each says what to change; docs/deployment.md#troubleshooting has more."
fi
