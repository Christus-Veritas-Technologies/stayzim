/**
 * Every line the copy engine can use, by slot. Placeholders:
 * {name} {town} {place} {country} {kind} {kinds} {Kind} {host} {view}
 * {mornings} {evenings} {landscape} {air} {doing} {rooms} {room} {roomCount}
 * {priceFrom}. A line whose placeholders can't all be filled is skipped, so
 * lines with {town} only appear for lodges that gave one.
 *
 * House style: plain, warm, short sentences; true of any decent place of the
 * kind and setting given; no claims about amenities, awards or prices beyond
 * what the lodge's own rooms say. Read docs/cms/copy.md before adding lines.
 */
import type { LodgeKind, Setting } from "../content/facts";

export type Pool = {
  any: readonly string[];
  setting?: Partial<Record<Setting, readonly string[]>>;
  kind?: Partial<Record<LodgeKind, readonly string[]>>;
};

export const LINES = {
  /** The big line over the hero photo (60 characters at most). */
  heroHeadline: {
    any: [
      "A quiet stay in {town}",
      "Rest well in {town}",
      "Your stay in {town} starts here",
      "Stay a while in {place}",
      "Welcome to {name}",
      "{name}, {town}",
      "Slow down in {town}",
      "Come and stay in {town}",
      "Your home in {town}",
      "Find your quiet in {place}",
      "Good rooms, a warm welcome",
      "Book direct, stay happy",
    ],
    setting: {
      mountains: ["Misty mornings in {town}", "Up in the hills of {town}", "Cool air and long views", "Wake up above the clouds", "Log fires and mountain air"],
      lake: ["Sunsets over the water", "Wake up by the water in {town}", "Lakeside days in {town}", "Still water, slow days", "Your lakeside stay in {town}"],
      bush: ["Wide skies in {town}", "Wake up to the bush", "Stay close to the wild", "Nights under the stars in {town}", "The bush, at your door"],
      river: ["Slow days by the river", "Riverside rest in {town}", "Shade, water and quiet", "By the river in {town}", "Listen to the river"],
      city: ["Your base in {town}", "Stay central in {town}", "A calm stay in the city", "Close to everything in {town}", "Rest easy in {town}"],
      farm: ["Country quiet in {town}", "Big skies and fresh air", "Slow farm days in {town}", "A country stay near {town}", "Open land, quiet nights"],
    },
    kind: {
      bnb: ["Bed, breakfast and a warm welcome", "Your B&B in {town}"],
      camp: ["Your camp in {place}", "Canvas, stars and quiet"],
      "holiday-home": ["A whole home in {town}", "Your holiday home in {town}"],
      "self-catering": ["Your own space in {town}", "Cook, rest and explore {town}"],
      hotel: ["Your hotel in {town}", "Comfort in the heart of {town}"],
      guesthouse: ["Your guesthouse in {town}", "A friendly stay in {town}"],
    },
  },

  /** Under the headline (140 characters at most). */
  heroSubline: {
    any: [
      "Comfortable {rooms} at {name}. See our prices and book direct with us.",
      "{name} is {host}. Pick your room and book in a minute.",
      "Book direct with {name}: no booking fees, and you talk to us, not a call centre.",
      "{roomCount} in {place}, each ready for you. Message us and we'll hold your dates.",
      "Simple, comfortable {rooms} in {place}. Book on the site or on WhatsApp.",
      "A warm welcome, clean {rooms} and good rest. That's {name}.",
      "Stay with us in {place}. See the {rooms}, check the prices, and book direct.",
      "From {priceFrom} a night at {name}. Book direct and we'll take care of the rest.",
    ],
    setting: {
      mountains: ["{mornings}, {evenings} and {air}. Book direct with {name}.", "Up in {landscape} near {town}: {doing}, then a warm room at {name}."],
      lake: ["{mornings} and {evenings}. {name} is right by the water.", "Stay by the lake at {name}: {doing} by day, {evenings} by night."],
      bush: ["{mornings} and {evenings}. {name} puts you close to the wild.", "Stay in {landscape} near {town}: {doing}, then rest at {name}."],
      river: ["{mornings} and {evenings}. {name} sits by the river.", "{air}: stay at {name} and let the river slow you down."],
      city: ["{air}: {name} is your base for {doing}.", "Stay central at {name}. Easy to reach, quiet to sleep in."],
      farm: ["{mornings} and {evenings}. {name} is a country stay near {town}.", "{air} and open land: rest at {name} and enjoy {doing}."],
    },
  },

  /** The title of the welcome or intro section. */
  welcomeTitle: {
    any: [
      "Welcome to {name}",
      "A warm welcome in {town}",
      "Make yourself at home",
      "Stay with us",
      "About {name}",
      "Why stay with us",
      "Rest, and leave the rest to us",
      "A good place to stay in {place}",
    ],
    setting: {
      mountains: ["Up in {landscape}", "Mountain air, warm rooms"],
      lake: ["Life by the water", "By the lake in {town}"],
      bush: ["Close to the wild", "Out in {landscape}"],
      river: ["By the river", "Where the river slows you down"],
      city: ["Your base in {town}", "In the middle of it all"],
      farm: ["Country quiet", "Out in {landscape}"],
    },
  },

  /** The first welcome paragraph: who and where. */
  welcomeOpen: {
    any: [
      "Here in {place}, {name} is {host}. We keep things simple: clean {rooms}, a friendly welcome and help with whatever you need.",
      "{name} is {host}, in {place}. Come for a night or stay for a week: we'll make you feel at home.",
      "Welcome to {name}, in {place}. We're {host}, and we'd love to have you to stay.",
      "At {name} in {place}, you'll find {roomCount}, a warm welcome and people who are glad you came.",
      "Looking for a place to stay in {town}? {name} is {host}, and every booking comes straight to us.",
    ],
    setting: {
      mountains: ["High up in {landscape} near {town}, {name} is {host}: {mornings}, {evenings} and {air}.", "{name} sits in {landscape} near {town}. Expect {mornings} and {evenings}."],
      lake: ["{name} is {host} by the water in {place}. Expect {mornings} and {evenings}.", "On the lakeshore in {place}, {name} is made for {evenings}."],
      bush: ["{name} is {host} out in {landscape} near {town}. Expect {mornings} and {evenings}.", "Out here near {town}, {name} puts you close to the wild."],
      river: ["{name} is {host} by the river in {place}. Expect {mornings} and {evenings}.", "On the river near {town}, {name} is a place to slow right down."],
      city: ["{name} is {host} in {town}, close to {doing}.", "In the heart of {town}, {name} is a calm place to stay."],
      farm: ["{name} is {host} out in {landscape} near {town}. Expect {mornings} and {evenings}.", "On a farm near {town}, {name} is all space, quiet and big skies."],
    },
  },

  /** More welcome paragraphs: two are used after the opening one. */
  welcomeBody: {
    any: [      "Whether you're here for a night on the road or a week away, we'll make sure you feel at home from the moment you arrive.",
      "Every booking comes straight to us, so you'll always talk to the people who run {name}. Ask us anything before you come.",
      "We're happy to help you plan your stay, from directions to the best things to do nearby.",
      "Families, couples and travellers on business all stay with us. Tell us what you need and we'll set things up for you.",
      "Booking direct means no booking fees and no middleman. Message us with your dates and we'll hold your room.",
      "Our {rooms} are kept clean, comfortable and quiet, so you sleep well and wake up ready for the day.",
      "Come for the rest, stay for the welcome. We hope {name} becomes your place to come back to.",
      "Travelling with friends or family? Tell us how many of you there are and we'll find the right {rooms} for you.",
      "We answer our own messages, so you'll always get a real reply from a real person.",
      "Arriving late or leaving early? Let us know and we'll work around your plans.",
    ],
    setting: {
      mountains: [
        "Here in {landscape}, days start with {mornings} and end with {evenings}. Bring a jersey: the air is cool and clear.",
        "Spend the day on {doing}, then come back to a warm room and a quiet night in the hills.",
      ],
      lake: [
        "Days here start with {mornings} and end with {evenings}. The water is never far away.",
        "Spend the day on {doing}, then watch the light change over the water from {name}.",
      ],
      bush: [
        "Out here, days start with {mornings} and end with {evenings}. Keep your camera close.",
        "Spend the day on {doing}, then come back to a comfortable bed and the sounds of the bush at night.",
      ],
      river: [
        "Days here start with {mornings} and end with {evenings}. The river sets the pace.",
        "Spend the day on {doing}, then rest in the shade by the water.",
      ],
      city: [
        "{name} keeps you close to {doing}, with a quiet room to come back to at the end of the day.",
        "Easy to find and easy to reach, {name} is a calm place to stay in {town}, for a night or for longer.",
      ],
      farm: [
        "Out in {landscape}, days start with {mornings} and end with {evenings}. There's room to breathe here.",
        "Enjoy {doing}, then come back to a comfortable room and a quiet country night.",
      ],
    },
    kind: {
      bnb: ["Breakfast is part of every stay: start the day well before you head out."],
      camp: ["Our camp is small on purpose: fewer guests, more quiet, and a real welcome."],
      "holiday-home": ["You'll have the whole home to yourselves, with space to cook, relax and spread out."],
      "self-catering": ["You'll have your own kitchen, so you can cook when you like and eat when you're ready."],
      hotel: ["Our team is on hand to help with anything you need during your stay."],
      guesthouse: ["We're a small guesthouse, so we get to know our guests and look after them properly."],
    },
  },

  /** A line under the rooms heading. */
  roomsIntro: {
    any: [
      "Prices are per room, per night. Pick the one that suits you and book direct.",
      "{roomCount}, each one clean, comfortable and ready for you.",
      "From {priceFrom} a night. Tap a room to see what's inside and book.",
      "Every room is booked direct with us: no booking fees.",
      "Choose your room, pick your dates, and we'll confirm with you.",
      "Simple, comfortable {rooms}. See the prices and book in a minute.",
    ],
    setting: {
      mountains: ["Warm {rooms} for cool mountain nights. Prices are per night."],
      lake: ["Comfortable {rooms} close to the water. Prices are per night."],
      bush: ["Comfortable {rooms} with the bush all around. Prices are per night."],
      river: ["Quiet {rooms} near the river. Prices are per night."],
      city: ["Quiet {rooms} in the heart of {town}. Prices are per night."],
      farm: ["Comfortable {rooms} with country views. Prices are per night."],
    },
  },

  /** What a site says when it has no rooms to show (not a demo). */
  roomsEmpty: {
    any: ["Our rooms are being added. Message us on WhatsApp and we'll tell you what's free.", "Rooms are coming soon. Message us on WhatsApp to book."],
  },

  galleryTitle: {
    any: ["Around {name}", "A look around", "See the place", "Life at {name}", "Photos"],
    setting: { mountains: ["In the hills"], lake: ["By the water"], bush: ["Out in the bush"], river: ["By the river"], farm: ["On the farm"] },
  },

  galleryIntro: {
    any: [
      "A few photos of {name}, so you know what to expect.",
      "Have a look around before you come.",
      "The rooms, the view and the little things that make a stay.",
      "See {name} the way our guests do.",
    ],
  },

  locationTitle: {
    any: ["Find us", "Getting here", "Where we are", "How to find {name}", "Visit us in {town}"],
  },

  locationIntro: {
    any: [
      "{name} is in {place}. Open the map for directions, or message us and we'll send you a pin.",
      "We're easy to find in {place}. If you get lost, call or message us and we'll guide you in.",
      "Message us when you're on your way and we'll be ready for you.",
      "Not sure of the road? Send us a message and we'll share directions.",
    ],
    setting: {
      mountains: ["The roads up into {landscape} can be slow: give yourself time and enjoy the views on the way."],
      bush: ["Some roads out here are gravel. Ask us about the best route before you set off."],
      city: ["We're close to the centre of {town}. Ask us about parking when you book."],
    },
  },

  contactTitle: { any: ["Talk to us", "Get in touch", "Book your stay", "Questions? Ask us", "We're here to help"] },

  contactIntro: {
    any: [
      "The quickest way to book is on WhatsApp. Send us your dates and how many of you there are.",
      "Message us on WhatsApp, call, or send an email. We'll get back to you as soon as we can.",
      "Ask us anything about your stay: rooms, directions, or what to do nearby.",
      "Every message comes straight to the people who run {name}.",
    ],
  },

  /** Three short lines for feature strips ("Book direct, no fees"). */
  highlights: {
    any: [
      "Book direct, no booking fees",
      "Talk to us on WhatsApp",
      "A warm welcome",
      "Clean, comfortable {rooms}",
      "Quick replies",
      "Help planning your stay",
      "Families welcome",
      "Easy to find in {town}",
    ],
    setting: {
      mountains: ["Cool, clear mountain air", "Walks right from the door"],
      lake: ["Views of the water", "Sunsets over the lake"],
      bush: ["Close to the wild", "Big skies at night"],
      river: ["By the river", "Shade and birdsong"],
      city: ["Close to everything", "Quiet at night"],
      farm: ["Open country", "Fresh air and quiet"],
    },
  },

  aboutTitle: { any: ["Our story", "About {name}", "The people behind {name}", "How {name} came to be", "Welcome to our place"] },

  aboutBody: {
    any: [
      "{name} started with a simple idea: a place in {place} where guests feel looked after from the moment they arrive.",
      "We're a small team, and we know the area well. Ask us where to eat, what to see and which road to take.",
      "We welcome families, friends, couples and people passing through, and we look after every one of them.",
      "We care about the details: a clean room, a good bed, a quick reply when you message us.",
      "When you book with us, you book with the people who run {name}. No middleman, no booking fees.",
      "We'd love to show you around. Message us on WhatsApp and tell us when you'd like to come.",
    ],
    setting: {
      mountains: ["We love {landscape}: {mornings}, {evenings}, and {air}. We think you will too."],
      lake: ["We love life by the water: {mornings}, {evenings}, and {doing} whenever you like."],
      bush: ["We love the bush: {mornings}, {evenings}, and the feeling of being far from everything."],
      river: ["We love the river: {mornings}, {evenings}, and the shade on a hot afternoon."],
      city: ["We love {town}, and we like helping our guests make the most of it."],
      farm: ["We love the country: {mornings}, {evenings}, and plenty of space to breathe."],
    },
  },

  experiencesTitle: { any: ["Things to do", "Make the most of your stay", "Around {town}", "What to do nearby"] },

  experiencesIntro: {
    any: [
      "Ask us about any of these when you book, and we'll help you plan.",
      "A few ideas for your stay. We're happy to point you in the right direction.",
      "There's plenty to do around {town}. Here's where to start.",
    ],
  },

  reviewsTitle: { any: ["What guests say", "From our guests", "Guests say", "Kind words"] },
  reviewsIntro: { any: ["A few words from people who've stayed with us.", "We love hearing from our guests. Here's what some of them said."] },

  journalTitle: { any: ["Journal", "Notes from {town}", "Stories from {name}", "News and notes"] },
  journalIntro: { any: ["News from {name}, and ideas for your stay in {place}.", "What's happening at {name}, and around {town}."] },

  bookCta: { any: ["Book your stay", "Check dates", "Book direct", "Plan your stay"] },

  /** The site's description for Google (155 characters at most). */
  metaDescription: {
    any: [
      "{name} in {place}: comfortable {rooms} from {priceFrom} a night. Book direct, no booking fees.",
      "Stay at {name}, {host} in {place}. See the {rooms} and book direct on WhatsApp.",
      "{name}: {roomCount} in {place}. See photos and prices, and book direct with us.",
      "Book direct with {name} in {place}. Clean, comfortable {rooms} and a warm welcome.",
    ],
  },
} satisfies Record<string, Pool>;

export type Slot = keyof typeof LINES;

/** Experiences by setting: invitations, not promises ("ask us about…"). */
export const EXPERIENCES: Record<Setting | "any", readonly { title: string; text: string }[]> = {
  any: [
    { title: "Local food", text: "Ask us where to eat nearby, from quick lunches to a proper dinner out." },
    { title: "Day trips", text: "We'll help you plan a day out from {town}." },
    { title: "Getting around", text: "Ask us for directions and tips on the roads before you set off." },
    { title: "Slow mornings", text: "Coffee, a good breakfast and nowhere you have to be." },
    { title: "Markets and crafts", text: "Ask us about local markets and where to find crafts to take home." },
    { title: "Rest", text: "Sometimes the best thing to do is nothing at all. We'll make sure it's quiet." },
    { title: "Celebrations", text: "Birthdays, anniversaries, small get-togethers: tell us and we'll help you plan." },
  ],
  mountains: [
    { title: "Hill walks", text: "Ask us about the trails nearby, from an easy stroll to a long day out." },
    { title: "Waterfalls", text: "There are falls and pools to find in {landscape}. We'll tell you which are worth the walk." },
    { title: "Trout fishing", text: "Ask us about fishing in the dams and streams nearby." },
    { title: "Fireside evenings", text: "Cool nights are made for a fire, a good meal and an early night." },
    { title: "Viewpoints", text: "Ask us where to watch the sunrise over {view}." },
    { title: "Farm stalls", text: "Fresh produce and local treats from the farms around {town}." },
  ],
  lake: [
    { title: "Boat trips", text: "Ask us about getting out on the water, from a short cruise to a full day." },
    { title: "Fishing", text: "Ask us where the fish are biting and how to get a permit." },
    { title: "Sunset watching", text: "Find a seat facing the water as the sun goes down." },
    { title: "Birdlife", text: "The lakeshore is full of birds. Bring binoculars." },
    { title: "Lakeside walks", text: "Easy walks along the shore, early or late in the day." },
    { title: "Swimming spots", text: "Ask us where it's safe to swim nearby before you go in." },
  ],
  bush: [
    { title: "Game viewing", text: "Ask us about game drives and the best times to see wildlife nearby." },
    { title: "Bush walks", text: "Walk with a guide and learn to read the tracks." },
    { title: "Birding", text: "Early mornings are full of birds. Bring binoculars and a book." },
    { title: "Stargazing", text: "Far from town lights, the night sky is something else." },
    { title: "Sundowners", text: "End the day with a drink as the sun drops over {view}." },
    { title: "Photography", text: "Ask us where to go for the best light and the best chance of a sighting." },
  ],
  river: [
    { title: "Fishing", text: "Ask us about the best fishing spots along the river." },
    { title: "River walks", text: "Shaded paths along the water, best early or late in the day." },
    { title: "Birdwatching", text: "Kingfishers, herons and more: the river is busy with birds." },
    { title: "Picnics", text: "Ask us for a quiet spot by the water for a long lunch." },
    { title: "Canoeing", text: "Ask us if the river is right for a paddle while you're here." },
    { title: "Sunset by the water", text: "Watch the light change on the river at the end of the day." },
  ],
  city: [
    { title: "Restaurants", text: "Ask us where to eat in {town}, from quick bites to a night out." },
    { title: "Shopping", text: "Markets, malls and craft shops: we'll tell you where to go." },
    { title: "Getting around", text: "Ask us about taxis and the easiest routes around {town}." },
    { title: "Meetings and work", text: "A quiet room and a good night's sleep before a busy day." },
    { title: "Museums and galleries", text: "Ask us what's on in {town} while you're here." },
    { title: "Parks and walks", text: "Green spaces nearby for a walk or a run." },
  ],
  farm: [
    { title: "Farm walks", text: "Walk the land, see the animals and stretch your legs." },
    { title: "Fresh produce", text: "Ask us about eggs, milk and vegetables from the farm and neighbours." },
    { title: "Big skies", text: "Wide open views and sunsets that go on and on." },
    { title: "Cycling", text: "Quiet country roads for an easy ride." },
    { title: "Birding", text: "The fields and dams nearby are good for birds." },
    { title: "Stargazing", text: "Away from town lights, the stars come out properly." },
  ],
};

/** Questions every lodge is asked, with answers that are true of a well-run one. */
export const FAQS: readonly { q: string; a: string }[] = [
  { q: "How do I book?", a: "Message us on WhatsApp with your dates and how many of you there are, and we'll confirm your room. You can also tap Book on any room." },
  { q: "What time is check-in?", a: "Check-in is from 14:00 and check-out is by 10:00. Arriving late? Let us know and we'll be ready for you." },
  { q: "Can we bring children?", a: "Yes, families are welcome. Tell us their ages when you book so we can set up the right room." },
  { q: "Is there somewhere to park?", a: "Let us know you're driving when you book, and we'll tell you where to park." },
  { q: "How do I pay?", a: "We'll tell you how to pay when we confirm your booking. Ask us if you'd like to pay in a particular way." },
  { q: "How do we find you?", a: "{name} is in {place}. Open the map on our site for directions, or message us and we'll send you a pin." },
  { q: "Can I cancel?", a: "Plans change. Message us as early as you can and we'll do our best to help." },
];

export const HOUSE_RULES: readonly string[] = ["Check-in from 14:00, check-out by 10:00", "Quiet after 22:00, so everyone sleeps well", "No smoking in the rooms"];

export const CANCELLATION = "Free cancellation up to 48 hours before you arrive. After that, the first night is charged.";
