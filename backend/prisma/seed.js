// Gigset seed — a small slice of real-ish Indian music data for local dev/demo.
// Run: npm run seed   (idempotent: wipes the seed tables first)
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // ---- wipe (reverse dependency order) ----
  await prisma.notification.deleteMany();
  await prisma.message.deleteMany();
  await prisma.conversationMember.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.application.deleteMany();
  await prisma.opportunity.deleteMany();
  await prisma.like.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.post.deleteMany();
  await prisma.connection.deleteMany();
  await prisma.stakeholderDetail.deleteMany();
  await prisma.article.deleteMany();
  await prisma.venue.deleteMany();
  await prisma.event.deleteMany();
  await prisma.user.deleteMany();

  // ---- users: performer, venue, buyer, crew ----
  const ananya = await prisma.user.create({
    data: {
      stakeholderType: 'PERFORMER',
      name: 'Ananya Iyer',
      bio: 'Carnatic vocalist blending classical roots with contemporary Sufi and indie sounds. 200+ live shows across India.',
      city: 'Chennai',
      verificationStatus: 'VERIFIED',
      detail: {
        create: {
          type: 'PERFORMER',
          data: { genres: ['Carnatic', 'Sufi', 'Indie'], instruments: ['Vocals', 'Harmonium'], ratePerShow: 45000 },
        },
      },
    },
  });

  const blueFrog = await prisma.user.create({
    data: {
      stakeholderType: 'VENUE',
      name: 'Blue Frog',
      bio: 'Mumbai’s iconic live music venue — intimate gigs, big sound, zero compromise.',
      city: 'Mumbai',
      verificationStatus: 'VERIFIED',
      detail: {
        create: {
          type: 'VENUE',
          data: { capacity: 300, type: 'live_music_venue', address: 'Mathuradas Mills Compound, Lower Parel, Mumbai' },
        },
      },
    },
  });

  const rahul = await prisma.user.create({
    data: {
      stakeholderType: 'BUYER',
      name: 'Rahul Mehta',
      bio: 'Independent curator & talent buyer. Programs Sufi and folk nights across Bengaluru and Pune.',
      city: 'Bengaluru',
      detail: {
        create: { type: 'BUYER', data: { org: 'Mehta Live', budget: '₹2L–₹10L per event' } },
      },
    },
  });

  const vikram = await prisma.user.create({
    data: {
      stakeholderType: 'CREW',
      name: 'Vikram Rao',
      bio: 'FOH & monitor engineer, 12 years. Specialises in small-room acoustics and festival stages.',
      city: 'Mumbai',
      verificationStatus: 'VERIFIED',
      detail: {
        create: { type: 'CREW', data: { skills: ['FOH', 'Monitors', 'RF coordination'], dayRate: 12000 } },
      },
    },
  });

  // ---- connection: Rahul follows Ananya ----
  await prisma.connection.create({
    data: { followerId: rahul.id, followeeId: ananya.id, status: 'ACCEPTED', kind: 'FOLLOW' },
  });

  // ---- posts: 3 posts, 1 comment, 1 like ----
  const post1 = await prisma.post.create({
    data: {
      authorId: ananya.id,
      body: 'Thrilled to announce my Sufi night at Blue Frog, Mumbai this October! Rehearsals start next week — who’s coming?',
    },
  });
  await prisma.post.create({
    data: {
      authorId: blueFrog.id,
      body: 'Jazz Weekend lineup is out 🎷 Three nights, six acts, one very happy PA system. Early birds on sale now.',
    },
  });
  await prisma.post.create({
    data: {
      authorId: vikram.id,
      body: 'Pro tip for small venues: ring out your monitors at show volume, not soundcheck volume. Your singers will thank you.',
    },
  });

  await prisma.comment.create({
    data: { postId: post1.id, authorId: rahul.id, body: 'Front row, as always. Let’s talk about a Bengaluru date after this!' },
  });
  await prisma.like.create({ data: { postId: post1.id, userId: vikram.id } });

  // ---- opportunities: 2, + 1 application ----
  const opp1 = await prisma.opportunity.create({
    data: {
      posterId: rahul.id,
      title: 'Headliner needed: Sufi Night, Bengaluru',
      description: 'Looking for a Sufi/Carnatic vocalist to headline a 400-cap Sufi night in Indiranagar. Full band welcome.',
      requirements: { setLength: '90 minutes', backline: 'provided', travel: 'covered' },
      city: 'Bengaluru',
      genre: 'Sufi',
      budgetMin: 50000,
      budgetMax: 150000,
    },
  });
  const opp2 = await prisma.opportunity.create({
    data: {
      posterId: blueFrog.id,
      title: 'Opening act: Jazz Weekend, Night 2',
      description: '25-minute opening slot for our Jazz Weekend. Originals preferred; trio or quartet.',
      requirements: { setLength: '25 minutes', originals: true },
      city: 'Mumbai',
      genre: 'Jazz',
      budgetMin: 15000,
      budgetMax: 30000,
    },
  });

  await prisma.application.create({
    data: { opportunityId: opp1.id, applicantId: ananya.id, message: 'Would love to bring my Sufi set to Bengaluru — 90 minutes, full band, all originals + classics.' },
  });

  // ---- venues (OSM-shaped) ----
  await prisma.venue.create({
    data: {
      name: 'Blue Frog',
      city: 'Mumbai',
      lat: 19.0596,
      lng: 72.8295,
      type: 'live_music_venue',
      address: 'Mathuradas Mills Compound, Senapati Bapat Marg, Lower Parel, Mumbai 400013',
      source: 'openstreetmap',
    },
  });
  await prisma.venue.create({
    data: {
      name: 'The Piano Man Jazz Club',
      city: 'New Delhi',
      lat: 28.5355,
      lng: 77.241,
      type: 'jazz_club',
      address: 'B 6-7/22, Safdarjung Enclave Market, New Delhi 110029',
      source: 'openstreetmap',
    },
  });

  // ---- event ----
  await prisma.event.create({
    data: {
      title: 'Sufi Night with Ananya Iyer',
      venue: 'Blue Frog',
      city: 'Mumbai',
      date: new Date('2026-10-10T20:00:00+05:30'),
      genre: 'Sufi',
      source: 'gigset-seed',
    },
  });

  // ---- articles ----
  await prisma.article.create({
    data: {
      title: 'How indie artists price gigs in India',
      excerpt: 'A practical framework for quoting club shows, college fests and corporate gigs — without undercutting the scene.',
      body: 'Pricing a gig in India is part math, part market-reading. Start with your floor: travel, crew, rehearsal time and gear wear. Then layer the room...',
      category: 'Industry',
      publishedAt: new Date('2026-09-10T10:00:00+05:30'),
      authorId: rahul.id,
    },
  });
  await prisma.article.create({
    data: {
      title: 'Soundcheck checklist for small venues',
      excerpt: 'Twelve things to verify before doors open, from someone who has mixed 2,000+ shows.',
      body: 'Small rooms forgive nothing. Here is the checklist I run before every doors-open...',
      category: 'How-to',
      publishedAt: new Date('2026-09-18T10:00:00+05:30'),
      authorId: vikram.id,
    },
  });

  // ---- conversation + 2 messages ----
  const convo = await prisma.conversation.create({ data: { title: 'Rahul ↔ Ananya' } });
  await prisma.conversationMember.createMany({
    data: [
      { conversationId: convo.id, userId: rahul.id },
      { conversationId: convo.id, userId: ananya.id },
    ],
  });
  await prisma.message.create({
    data: { conversationId: convo.id, senderId: rahul.id, body: 'Hi Ananya! Loved your set at the Kappa TV sessions. Would you headline our Sufi night in Bengaluru?' },
  });
  await prisma.message.create({
    data: { conversationId: convo.id, senderId: ananya.id, body: 'Hi Rahul! Thank you — I’d love to. I just applied to your opportunity with my band details.' },
  });

  // ---- notification ----
  await prisma.notification.create({
    data: {
      userId: rahul.id,
      type: 'application',
      title: 'New application received',
      body: 'Ananya Iyer applied to “Headliner needed: Sufi Night, Bengaluru”.',
      link: `/opportunities/${opp1.id}`,
    },
  });

  // ---- booking (mirrors the frontend BookingModal flow) ----
  await prisma.booking.create({
    data: {
      requesterId: rahul.id,
      hostId: ananya.id,
      date: '2026-10-10',
      timeSlot: '8–10 PM',
      budget: '₹30k–60k',
      message: 'Headline slot, 90-minute Sufi set with full band. Travel + stay covered.',
      status: 'PENDING',
    },
  });

  console.log('Seed complete:');
  console.log(`  users:        Ananya Iyer (${ananya.id}), Blue Frog (${blueFrog.id}), Rahul Mehta (${rahul.id}), Vikram Rao (${vikram.id})`);
  console.log('  connection:   Rahul -> Ananya (FOLLOW, ACCEPTED)');
  console.log('  posts:        3 posts, 1 comment, 1 like');
  console.log(`  opportunities: 2 (opp1=${opp1.id}, opp2=${opp2.id}), 1 application`);
  console.log('  venues:       Blue Frog (Mumbai), The Piano Man Jazz Club (New Delhi)');
  console.log('  events:       1 (Sufi Night, 2026-10-10)');
  console.log('  articles:     2');
  console.log('  conversation: 1 with 2 messages (Rahul <-> Ananya)');
  console.log('  notification: 1 (application alert for Rahul)');
  console.log('  booking:      1 (Rahul -> Ananya, PENDING)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
