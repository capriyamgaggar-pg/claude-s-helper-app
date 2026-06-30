
-- Demo users (no password set → cannot sign in; just placeholders for FK)
DO $$
DECLARE
  u1 uuid := '11111111-1111-1111-1111-111111111101';
  u2 uuid := '11111111-1111-1111-1111-111111111102';
  u3 uuid := '11111111-1111-1111-1111-111111111103';
  u4 uuid := '11111111-1111-1111-1111-111111111104';
  u5 uuid := '11111111-1111-1111-1111-111111111105';
  u6 uuid := '11111111-1111-1111-1111-111111111106';
  u7 uuid := '11111111-1111-1111-1111-111111111107';
  u8 uuid := '11111111-1111-1111-1111-111111111108';
BEGIN
  INSERT INTO auth.users (id, instance_id, aud, role, email, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_sso_user, is_anonymous)
  VALUES
    (u1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'demo.aarav@intent.demo',    now(), now(), now(), '{"provider":"demo"}'::jsonb, '{}'::jsonb, false, false),
    (u2, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'demo.isha@intent.demo',     now(), now(), now(), '{"provider":"demo"}'::jsonb, '{}'::jsonb, false, false),
    (u3, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'demo.kabir@intent.demo',    now(), now(), now(), '{"provider":"demo"}'::jsonb, '{}'::jsonb, false, false),
    (u4, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'demo.meera@intent.demo',    now(), now(), now(), '{"provider":"demo"}'::jsonb, '{}'::jsonb, false, false),
    (u5, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'demo.rohan@intent.demo',    now(), now(), now(), '{"provider":"demo"}'::jsonb, '{}'::jsonb, false, false),
    (u6, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'demo.tara@intent.demo',     now(), now(), now(), '{"provider":"demo"}'::jsonb, '{}'::jsonb, false, false),
    (u7, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'demo.dev@intent.demo',      now(), now(), now(), '{"provider":"demo"}'::jsonb, '{}'::jsonb, false, false),
    (u8, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'demo.nisha@intent.demo',    now(), now(), now(), '{"provider":"demo"}'::jsonb, '{}'::jsonb, false, false)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.profiles (id, name, photo_url, city, profession, bio, interests, languages, onboarded)
  VALUES
    (u1, 'Aarav Sharma',  'https://i.pravatar.cc/200?img=12', 'Bhilwara',  'Textile entrepreneur', 'Building a sustainable yarn brand.',                ARRAY['Startups','Travel','Tech'],           ARRAY['English','Hindi'], true),
    (u2, 'Isha Verma',    'https://i.pravatar.cc/200?img=47', 'Bengaluru', 'Product designer',     'Looking for weekend trek buddies.',                 ARRAY['Trekking','Photography','Coffee'],    ARRAY['English','Hindi'], true),
    (u3, 'Kabir Singh',   'https://i.pravatar.cc/200?img=33', 'Mumbai',    'Founder, fintech',     'Solo founder hunting a technical co-founder.',      ARRAY['Startups','Tech','Reading'],          ARRAY['English','Hindi'], true),
    (u4, 'Meera Iyer',    'https://i.pravatar.cc/200?img=49', 'Delhi',     'UX researcher',        'New in town — looking for a flatmate in South Delhi.', ARRAY['Music','Yoga','Food'],             ARRAY['English','Hindi','Tamil'], true),
    (u5, 'Rohan Mehta',   'https://i.pravatar.cc/200?img=15', 'Udaipur',   'Travel photographer',  'Planning a Himalayan ride. Anyone in?',             ARRAY['Travel','Photography','Cinema'],      ARRAY['English','Hindi'], true),
    (u6, 'Tara Kapoor',   'https://i.pravatar.cc/200?img=44', 'Pune',      'Marathon runner',      'Sunday long-runs. Pace 5:30/km.',                   ARRAY['Fitness','Cycling','Food'],           ARRAY['English','Hindi','Marathi'], true),
    (u7, 'Dev Patel',     'https://i.pravatar.cc/200?img=68', 'Bengaluru', 'Senior engineer',      'Open to side-projects in AI tooling.',              ARRAY['Tech','Startups','Reading'],          ARRAY['English','Hindi','Gujarati'], true),
    (u8, 'Nisha Rao',     'https://i.pravatar.cc/200?img=25', 'Bhilwara',  'CA, finance',          'Want a study group for CFA L2.',                    ARRAY['Reading','Coffee','Yoga'],            ARRAY['English','Hindi'], true)
  ON CONFLICT (id) DO NOTHING;

  -- Demo intents
  INSERT INTO public.intents (creator_id, title, description, category_slug, city, people_needed, tags, starts_at)
  VALUES
    (u4, 'Flatmate in South Delhi (Saket / GK)',        'Looking for a working-professional flatmate. 2BHK, ₹22k each, move-in by next month.', 'flatmate',  'Delhi',     1, ARRAY['2BHK','Saket'], NULL),
    (u8, 'Flatmate near Pur Road, Bhilwara',            'Female flatmate preferred, furnished room, quiet building.',                            'flatmate',  'Bhilwara',  1, ARRAY['Female-only'], NULL),
    (u3, 'Technical co-founder — fintech for MSMEs',    'Solo non-tech founder, 6 months of customer research done. Looking for full-stack/AI engineer.', 'cofounder', 'Mumbai', 1, ARRAY['Fintech','Equity'], NULL),
    (u7, 'Weekend hack-builder for AI dev-tools',       'Side-project energy, not a startup (yet). Eng background preferred.',                   'cofounder', 'Bengaluru', 2, ARRAY['AI','Side-project'], NULL),
    (u2, 'Kudremukh trek — 2 days',                     'Group of 4 forming. Mid-level fitness. Sharing tents.',                                 'trekking',  'Bengaluru', 2, ARRAY['Weekend','Karnataka'], now() + interval '14 days'),
    (u5, 'Spiti road-trip in October',                  'Self-drive, 8 days, 2 cars. 3 seats open.',                                             'travel',    'Udaipur',   3, ARRAY['Road-trip','Himalayas'], now() + interval '60 days'),
    (u6, 'Sunday long run — 18km',                      'Pace 5:30/km, meet at Aundh 5:30am. Coffee after.',                                     'sports',    'Pune',      4, ARRAY['Running','Marathon'], now() + interval '5 days'),
    (u1, 'Booth partner — Yarn Expo Mumbai',            'Splitting a 6sqm booth. Looking for a complementary textile brand.',                   'event',     'Mumbai',    1, ARRAY['B2B','Textile'], now() + interval '40 days'),
    (u3, 'Founders coffee — Bandra',                    'Casual 1:1s with other early-stage founders. Saturday 9am.',                            'networking','Mumbai',    6, ARRAY['Founders','Coffee'], now() + interval '3 days'),
    (u8, 'CFA L2 study group',                          'Twice-weekly evening sessions on Zoom + Sunday in-person if local.',                    'study',     'Bhilwara',  4, ARRAY['Finance','CFA'], NULL),
    (u2, 'Film photography walk',                       'Sunday morning, Cubbon Park. Bring your camera, any format.',                           'hobby',     'Bengaluru', 5, ARRAY['Photography'], now() + interval '7 days'),
    (u5, 'Sunset cycle — Fateh Sagar loop',             '25km easy ride, golden hour. All levels welcome.',                                       'sports',    'Udaipur',   8, ARRAY['Cycling','Sunset'], now() + interval '2 days');
END $$;
