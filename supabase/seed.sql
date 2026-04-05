-- ============================================================
-- GutaGuru Seed Data — Harare & Bulawayo events
-- Run AFTER schema.sql in the Supabase SQL Editor
-- ============================================================

-- ============================================================
-- VENUES
-- ============================================================
INSERT INTO venues (id, name, address, city) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'Rooftop 580',         'Sam Nujoma St, Harare CBD',          'Harare'),
  ('a1000000-0000-0000-0000-000000000002', 'Soko Market',         'Borrowdale Rd, Borrowdale',          'Harare'),
  ('a1000000-0000-0000-0000-000000000003', 'Mannenberg Jazz Club','1 Josiah Chinamano Ave',             'Harare'),
  ('a1000000-0000-0000-0000-000000000004', 'National Gallery ZW', 'Julius Nyerere Way',                 'Harare'),
  ('a1000000-0000-0000-0000-000000000005', 'Harare Gardens',      'Park Lane, Harare',                  'Harare'),
  ('a1000000-0000-0000-0000-000000000006', 'Cresta Lodge',        'Samora Machel Ave West, Harare',     'Harare'),
  ('a1000000-0000-0000-0000-000000000007', 'Bulawayo Athletic Club','Fife St & 8th Ave',                'Bulawayo'),
  ('a1000000-0000-0000-0000-000000000008', 'Bulawayo Theatre',    'Fort St & Leopold Takawira Ave',     'Bulawayo'),
  ('a1000000-0000-0000-0000-000000000009', 'Large City Hall',     '8th Ave & Main St',                  'Bulawayo'),
  ('a1000000-0000-0000-0000-000000000010', 'Nesbitt Castle',      'Hillside Rd, Hillside, Bulawayo',    'Bulawayo')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- EVENTS — Harare
-- ============================================================
INSERT INTO events (title, description, date_time, location, city, category, image_url, ticket_link, venue_id, upvotes_count, saves_count) VALUES

(
  'Sunset Afrobeats Rooftop Session',
  'Zimbabwe''s hottest DJs take over the rooftop with the best in Afrobeats, Amapiano, and Zim dancehall. Stunning city views, craft cocktails, and an electric crowd. Don''t miss the set from DJ Taka and special guest Winky D.',
  NOW() + INTERVAL '1 day 19 hours',
  'Rooftop 580, Harare CBD',
  'Harare',
  'Music',
  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&q=80',
  'https://zimtickets.co.zw',
  'a1000000-0000-0000-0000-000000000001',
  47, 23
),

(
  'Soko Food Festival 2025',
  'A celebration of Zimbabwe''s vibrant food culture. Over 30 vendors serving traditional Zimbabwean cuisine, street food, craft beers, and fusion dishes. Live cooking demos, a chilli-eating contest, and live Mbira music all weekend.',
  NOW() + INTERVAL '5 days 10 hours',
  'Soko Market, Borrowdale',
  'Harare',
  'Food',
  'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&q=80',
  'https://zimtickets.co.zw',
  'a1000000-0000-0000-0000-000000000002',
  62, 38
),

(
  'Mannenberg Jazz Night',
  'One of Harare''s most beloved jazz venues hosts an intimate evening featuring local jazz legends and rising stars. Classic Zimbabwe jazz, improvisational sets, and world-class music in an intimate setting.',
  NOW() + INTERVAL '2 days 20 hours',
  'Mannenberg Jazz Club',
  'Harare',
  'Music',
  'https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=800&q=80',
  NULL,
  'a1000000-0000-0000-0000-000000000003',
  18, 9
),

(
  'Zimbabwe Art Collective Exhibition',
  'A stunning showcase of contemporary Zimbabwean art spanning painting, sculpture, photography, and digital art. Featuring 25 emerging and established artists from across the country. Opening night includes a live performance by musician Jah Prayzah.',
  NOW() + INTERVAL '3 days 16 hours',
  'National Gallery of Zimbabwe',
  'Harare',
  'Art',
  'https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?w=800&q=80',
  'https://nationalgallery.co.zw',
  'a1000000-0000-0000-0000-000000000004',
  24, 15
),

(
  'Tech Founders Networking Brunch',
  'Connect with Harare''s growing startup ecosystem over brunch. Hear pitches from 5 Zimbabwean startups, connect with investors, and workshop ideas with fellow founders. Perfect for developers, designers, and entrepreneurs.',
  NOW() + INTERVAL '6 days 9 hours',
  'Cresta Lodge, Harare',
  'Harare',
  'Networking',
  'https://images.unsplash.com/photo-1556761175-4b46a572b786?w=800&q=80',
  'https://eventbrite.com',
  'a1000000-0000-0000-0000-000000000006',
  31, 19
),

(
  'Harare Gardens Cultural Picnic',
  'Bring a blanket and soak up Zimbabwe''s rich cultural tapestry at this free community event. Traditional dance, storytelling, mbira workshops, face painting, and food stalls. A perfect family day out in the heart of the city.',
  NOW() + INTERVAL '4 days 11 hours',
  'Harare Gardens',
  'Harare',
  'Culture',
  'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&q=80',
  NULL,
  'a1000000-0000-0000-0000-000000000005',
  55, 27
),

(
  'Amapiano All Night Long',
  'South Africa''s hottest genre meets Harare''s nightlife. Three floors, six DJs, and a sound system that will make the whole city feel it. DJ Maphorisa collaborator and ZIM Amapiano pioneer DJ Bass on the decks.',
  NOW() + INTERVAL '1 day 22 hours',
  'Rooftop 580, Harare CBD',
  'Harare',
  'Music',
  'https://images.unsplash.com/photo-1571266028243-e4733b0f0bb0?w=800&q=80',
  'https://zimtickets.co.zw',
  'a1000000-0000-0000-0000-000000000001',
  73, 41
),

(
  'Harare Marathon 2025',
  'Zimbabwe''s premier road race returns! Choose from the full 42km marathon, 21km half marathon, or 10km fun run. All fitness levels welcome. Post-race party with live music, food, and prizes for top finishers.',
  NOW() + INTERVAL '7 days 6 hours',
  'Harare Gardens',
  'Harare',
  'Sports',
  'https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=800&q=80',
  'https://hararemarathon.co.zw',
  'a1000000-0000-0000-0000-000000000005',
  44, 22
),

-- ============================================================
-- EVENTS — Bulawayo
-- ============================================================
(
  'Intwasa Arts Festival',
  'Bulawayo''s premier annual arts festival returns with theatre, music, poetry, and film. A week-long celebration of Zimbabwean and African creativity featuring artists from 12 countries. The highlight of the Bulawayo cultural calendar.',
  NOW() + INTERVAL '4 days 14 hours',
  'Bulawayo Theatre & City Hall',
  'Bulawayo',
  'Culture',
  'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=800&q=80',
  'https://intwasa.org',
  'a1000000-0000-0000-0000-000000000008',
  89, 52
),

(
  'Bulawayo Braai & Craft Beer Fest',
  'The ultimate outdoor social event. Pitmasters compete for the best braai title, while 12 Zimbabwean craft breweries showcase their finest beers. Live music, lawn games, and a dedicated kids'' zone make this a perfect weekend for everyone.',
  NOW() + INTERVAL '5 days 12 hours',
  'Bulawayo Athletic Club',
  'Bulawayo',
  'Food',
  'https://images.unsplash.com/photo-1529694157872-4e0c0f3b238b?w=800&q=80',
  'https://zimtickets.co.zw',
  'a1000000-0000-0000-0000-000000000007',
  38, 21
),

(
  'Nesbitt Castle Sundowner',
  'A glamorous evening at Bulawayo''s most iconic venue. Dress to impress for cocktails on the castle grounds, a jazz trio performance, and a formal dinner under the stars. Limited tickets available.',
  NOW() + INTERVAL '2 days 17 hours',
  'Nesbitt Castle, Hillside',
  'Bulawayo',
  'Culture',
  'https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?w=800&q=80',
  'https://nesbitcastle.co.zw',
  'a1000000-0000-0000-0000-000000000010',
  27, 16
),

(
  'Bulawayo Business Expo 2025',
  'The largest business networking event in Matabeleland. Over 80 exhibitors, keynote speakers, and panel discussions on Zimbabwe''s economic future. Connect with decision-makers, investors, and innovators from across the country.',
  NOW() + INTERVAL '6 days 8 hours',
  'Large City Hall, Bulawayo',
  'Bulawayo',
  'Networking',
  'https://images.unsplash.com/photo-1591115765373-5207764f72e7?w=800&q=80',
  'https://bulawayoexpo.co.zw',
  'a1000000-0000-0000-0000-000000000009',
  15, 8
),

(
  'Gumboot Dance Workshop',
  'Learn the powerful rhythms and movements of Zimbabwe''s beloved gumboot dance tradition. An interactive workshop open to all ages and skill levels led by master dancers from the National Dance Company of Zimbabwe.',
  NOW() + INTERVAL '3 days 15 hours',
  'Large City Hall, Bulawayo',
  'Bulawayo',
  'Culture',
  'https://images.unsplash.com/photo-1547153760-18fc86324498?w=800&q=80',
  NULL,
  'a1000000-0000-0000-0000-000000000009',
  21, 12
)

ON CONFLICT DO NOTHING;
