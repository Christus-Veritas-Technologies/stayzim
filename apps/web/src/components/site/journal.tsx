import { formatPostDate, postBlocks, type SitePost, type SitePostFull } from "@stayzim/sites";
import { cn } from "@stayzim/ui/lib/utils";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";

import { BookLabel, bookTone, MadeWith, Photo, siteBasics, WhatsAppFab } from "@/components/site/parts";
import { SampleBadge } from "@/components/site/sample-badge";
import { cormorantGaramond, instrumentSerif, tenorSans } from "@/components/site/template-fonts";
import { BookLink } from "@/components/site/tracking";
import type { LiveSite } from "@/lib/site";
import { siteUrl } from "@/lib/site-host";

/** The journal's address on the lodge's own site: /journal, or /journal/{post}. */
export function journalUrl(site: Pick<LiveSite, "slug" | "customDomain">, post?: string) {
  return `${siteUrl(site)}/journal${post ? `/${post}` : ""}`;
}

/** Each Pro template's type, so the journal reads like the rest of the site. */
const LOOKS: Record<string, { font: string; display: string; page: string; ink: string; muted: string }> = {
  "pro-escarpment": {
    font: cormorantGaramond.variable,
    display: "font-[family-name:var(--font-cormorant)] font-medium",
    page: "bg-[#F4EEE3]",
    ink: "text-[#1A1712]",
    muted: "text-[#6B6458]",
  },
  "pro-courtyard": {
    font: tenorSans.variable,
    display: "font-[family-name:var(--font-tenor)] uppercase tracking-[0.06em]",
    page: "bg-[#F0EBE3]",
    ink: "text-[#1C1B19]",
    muted: "text-[#6B655B]",
  },
  "pro-canopy": {
    font: instrumentSerif.variable,
    display: "font-[family-name:var(--font-instrument-serif)]",
    page: "bg-[#EFEAE2]",
    ink: "text-[#1F1A14]",
    muted: "text-[#6D6457]",
  },
};
const FALLBACK = LOOKS["pro-escarpment"]!;

export function journalLook(template: string) {
  return LOOKS[template] ?? FALLBACK;
}

/** Header, footer and the lodge's colour around a journal page. */
export function JournalShell({ site, children }: { site: LiveSite; children: ReactNode }) {
  const look = journalLook(site.template);
  const { book, online } = siteBasics(site);
  return (
    <div style={{ "--theme": site.themeColor } as CSSProperties} className={cn(look.font, look.page, look.ink, "min-h-svh font-sans")}>
      <header className="border-b border-black/[0.08]">
        <div className="mx-auto flex h-16 max-w-[1100px] items-center justify-between gap-4 px-4 sm:h-20 sm:px-8">
          <a href={siteUrl(site)} className={cn(look.display, "truncate text-[22px] sm:text-[26px]")}>
            {site.name}
          </a>
          <nav className="flex items-center gap-5 text-[14.5px] font-medium">
            <a href={journalUrl(site)} className="hidden hover:text-[var(--theme)] sm:inline">
              Journal
            </a>
            {book ? (
              <BookLink href={book} className={cn("inline-flex h-10 items-center gap-2 rounded-full px-4 text-[14px] font-semibold", bookTone(online))}>
                <BookLabel online={online} size={16} short />
              </BookLink>
            ) : null}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-[1100px] px-4 py-14 sm:px-8 sm:py-20">{children}</main>
      <footer className="border-t border-black/[0.08]">
        <div className={cn("mx-auto flex max-w-[1100px] flex-col items-center gap-2 px-4 py-6 text-[13.5px] sm:flex-row sm:justify-between sm:px-8", look.muted)}>
          <span>
            © {new Date().getFullYear()} {site.name}
          </span>
          <MadeWith />
        </div>
      </footer>
      <WhatsAppFab site={site} />
    </div>
  );
}

/** "12 Sep 2026 · 4 min read" */
export function postMeta(post: SitePost) {
  return `${formatPostDate(post.publishedOn)} · ${post.readMinutes} min read`;
}

/** The journal page: every post, newest first. */
export function JournalList({ site, posts }: { site: LiveSite; posts: SitePost[] }) {
  const look = journalLook(site.template);
  return (
    <JournalShell site={site}>
      <div className="mb-12 flex flex-col gap-3">
        <span className="text-[12.5px] font-semibold tracking-[0.2em] text-[var(--theme)] uppercase">Journal</span>
        <h1 className={cn(look.display, "text-[44px] leading-[48px] sm:text-[60px] sm:leading-[64px]")}>
          Notes from {site.town ?? site.name}
        </h1>
      </div>
      {posts.length === 0 ? (
        <p className={look.muted}>The first post is on its way.</p>
      ) : (
        <ul className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <li key={post.slug}>
              <a href={journalUrl(site, post.slug)} className="group flex flex-col gap-4">
                <div className="relative">
                  <Photo photo={post.cover ?? undefined} alt="" sizes="(min-width: 1024px) 340px, (min-width: 640px) 50vw, 100vw" className="aspect-[4/3] w-full rounded-[4px]" />
                  {site.samples.journal ? <SampleBadge className="absolute top-3 left-3" /> : null}
                </div>
                <span className={cn("text-[13px]", look.muted)}>{postMeta(post)}</span>
                <span className={cn(look.display, "text-[26px] leading-8 group-hover:text-[var(--theme)]")}>{post.title}</span>
                {post.excerpt ? <span className={cn("text-[15px] leading-6", look.muted)}>{post.excerpt}</span> : null}
              </a>
            </li>
          ))}
        </ul>
      )}
    </JournalShell>
  );
}

/** One post: cover, title, the text, and the way back to booking. */
export function JournalPost({ site, post }: { site: LiveSite; post: SitePostFull }) {
  const look = journalLook(site.template);
  const { book, online } = siteBasics(site);
  return (
    <JournalShell site={site}>
      <article className="mx-auto flex max-w-[720px] flex-col gap-8">
        <a href={journalUrl(site)} className={cn("inline-flex w-fit items-center gap-2 text-[14px] font-medium hover:text-[var(--theme)]", look.muted)}>
          <ArrowLeft className="size-4" aria-hidden="true" />
          All posts
        </a>
        <header className="flex flex-col gap-4">
          {site.samples.journal ? <SampleBadge label="Example post" /> : null}
          <span className={cn("text-[13.5px]", look.muted)}>{postMeta(post)}</span>
          <h1 className={cn(look.display, "text-[40px] leading-[46px] text-balance sm:text-[56px] sm:leading-[62px]")}>{post.title}</h1>
          {post.excerpt ? <p className={cn("text-[19px] leading-8", look.muted)}>{post.excerpt}</p> : null}
        </header>
        {post.cover ? <Photo photo={post.cover} alt="" sizes="(min-width: 768px) 720px, 100vw" className="aspect-[16/10] w-full rounded-[4px]" /> : null}
        <div className="flex flex-col gap-5 text-[17px] leading-[30px]">
          {postBlocks(post.body).map((block, index) =>
            block.kind === "heading" ? (
              <h2 key={index} className={cn(look.display, "mt-4 text-[30px] leading-9")}>
                {block.text}
              </h2>
            ) : (
              <p key={index} className="whitespace-pre-line">
                {block.text}
              </p>
            ),
          )}
        </div>
        {book ? (
          <aside className="mt-6 flex flex-col gap-4 rounded-[6px] bg-[var(--theme)] p-7 text-white sm:flex-row sm:items-center sm:justify-between">
            <span className={cn(look.display, "text-[26px] leading-8")}>Stay at {site.name}</span>
            <span className="flex flex-wrap gap-2">
              <BookLink href={book} className={cn("inline-flex h-11 items-center gap-2 rounded-full px-5 text-[15px] font-semibold", online ? "bg-white text-[var(--theme)]" : bookTone(false))}>
                <BookLabel online={online} size={17} />
              </BookLink>
              <a href={siteUrl(site)} className="inline-flex h-11 items-center gap-1.5 rounded-full border border-white/40 px-5 text-[15px] font-semibold hover:bg-white/10">
                See the rooms
                <ArrowUpRight className="size-4" aria-hidden="true" />
              </a>
            </span>
          </aside>
        ) : null}
      </article>
    </JournalShell>
  );
}
