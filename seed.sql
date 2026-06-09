-- ============================================================
-- Mosaic — Seed data
-- Run AFTER schema.sql. Seeds the activity catalogue only if the
-- table is empty, so it is safe to re-run.
-- (notes column = location chip; one row per day for multi-day activities)
-- ============================================================

insert into activities (name, emoji, color, category, day_of_week, start_block, end_block, mode, notes, practitioner_led, bring_money_amount)
select * from (values
  -- name,                               emoji,  color,     category,                  dow, sb, eb, mode,          location,     pract, money
  ('Lifestyle Cooking',                  '🍳', '#E8913A', 'Capacity Building',          1, 1, 2, 'program'::participant_mode, 'Lakes', false, null::numeric),
  ('Music',                              '🎵', '#8E44AD', 'Creative Expression',        1, 1, 2, 'program',     'Lakes',      false, null),
  ('Art',                                '🖌️', '#E74C3C', 'Creative Expression',        1, 1, 2, 'program',     'Lakes',      false, null),
  ('Digital Design',                     '💻', '#16A085', 'Capacity Building',          1, 1, 2, 'program',     'Lakes',      false, null),
  ('Mechanics, Metal Work & Woodwork',   '🔧', '#7F8C8D', 'Life Skills',                1, 1, 2, 'program',     'Bairnsdale', false, null),
  ('Art Therapy',                        '🎨', '#9B59B6', 'Creative Expression',        1, 2, 2, 'program',     'Lakes',      true,  null),
  ('Odd Jobs',                           '🔨', '#F39C12', 'Life Skills',                2, 1, 2, 'program',     'Lakes',      false, null),
  ('Indoor Games',                       '🎲', '#2980B9', 'Social Connection',          2, 1, 2, 'program',     'Bairnsdale', false, null),
  ('Garden Club',                        '🌱', '#27AE60', 'Capacity Building',          2, 1, 2, 'program',     'Bairnsdale', false, null),
  ('Exploring East Gippsland',           '🚐', '#D35400', 'Community Participation',    2, 1, 2, 'program',     'Bairnsdale', false, null),
  ('Swimming (Aqua Dome)',               '🏊', '#3498DB', 'Fitness & Wellbeing',        3, 1, 2, 'program',     'Lakes',      false, null),
  ('Footy',                              '🏉', '#C0392B', 'Fitness & Wellbeing',        3, 1, 2, 'program',     'Lakes',      false, null),
  ('In-House Activities',                '🏠', '#E67E22', 'Social Connection',          3, 1, 2, 'program',     'Lakes',      false, null),
  ('Cast a Line',                        '🎣', '#4A90D9', 'Community Participation',    4, 2, 2, 'program',     'Lakes',      false, 20),
  ('Mini Golf',                          '⛳', '#2ECC71', 'Community Participation',    4, 2, 2, 'program',     'Lakes',      false, null),
  ('Digital Design',                     '💻', '#16A085', 'Capacity Building',          4, 1, 2, 'program',     'Lakes',      false, null),
  ('Beauty Therapy',                     '💆', '#E91E8C', 'Self-Care',                  5, 1, 1, 'program',     'Lakes',      true,  null),
  ('Art Therapy',                        '🎨', '#9B59B6', 'Creative Expression',        5, 2, 2, 'program',     'Lakes',      true,  null),
  ('Bowling',                            '🎳', '#8E44AD', 'Community Participation',    5, 1, 2, 'program',     'Sale',       false, null),
  ('Free Choice',                        '🌟', '#F1C40F', 'Community Participation',    5, 1, 2, 'program',     'Lakes',      false, null),
  -- One-on-one (offered every weekday)
  ('Community Outing',                   '🚗', '#3F51B5', '1:1 Support',                1, 1, 1, 'one_on_one',  null,         false, null),
  ('Community Outing',                   '🚗', '#3F51B5', '1:1 Support',                2, 1, 1, 'one_on_one',  null,         false, null),
  ('Community Outing',                   '🚗', '#3F51B5', '1:1 Support',                3, 1, 1, 'one_on_one',  null,         false, null),
  ('Community Outing',                   '🚗', '#3F51B5', '1:1 Support',                4, 1, 1, 'one_on_one',  null,         false, null),
  ('Community Outing',                   '🚗', '#3F51B5', '1:1 Support',                5, 1, 1, 'one_on_one',  null,         false, null),
  ('Shopping Support',                   '🛒', '#009688', '1:1 Support',                1, 2, 2, 'one_on_one',  null,         false, null),
  ('Shopping Support',                   '🛒', '#009688', '1:1 Support',                2, 2, 2, 'one_on_one',  null,         false, null),
  ('Shopping Support',                   '🛒', '#009688', '1:1 Support',                3, 2, 2, 'one_on_one',  null,         false, null),
  ('Shopping Support',                   '🛒', '#009688', '1:1 Support',                4, 2, 2, 'one_on_one',  null,         false, null),
  ('Shopping Support',                   '🛒', '#009688', '1:1 Support',                5, 2, 2, 'one_on_one',  null,         false, null),
  ('Skill Building & Resume Writing',    '🏋️', '#795548', '1:1 Support',                1, 3, 3, 'one_on_one',  null,         false, null),
  ('Skill Building & Resume Writing',    '🏋️', '#795548', '1:1 Support',                2, 3, 3, 'one_on_one',  null,         false, null),
  ('Skill Building & Resume Writing',    '🏋️', '#795548', '1:1 Support',                3, 3, 3, 'one_on_one',  null,         false, null),
  ('Skill Building & Resume Writing',    '🏋️', '#795548', '1:1 Support',                4, 3, 3, 'one_on_one',  null,         false, null),
  ('Skill Building & Resume Writing',    '🏋️', '#795548', '1:1 Support',                5, 3, 3, 'one_on_one',  null,         false, null)
) as v(name, emoji, color, category, day_of_week, start_block, end_block, mode, notes, practitioner_led, bring_money_amount)
where not exists (select 1 from activities limit 1);

-- ============================================================
-- FIRST ADMIN  (run once, after you create the auth user)
-- ------------------------------------------------------------
-- 1) In Supabase → Authentication → Users → "Add user", create your
--    staff email + password (e.g. you@mosaic.com.au).
-- 2) Copy that user's UUID, then run (replace both placeholders):
--
--    insert into profiles (id, role, display_name)
--    values ('PASTE-AUTH-USER-UUID', 'admin', 'Your Name')
--    on conflict (id) do update set role = 'admin';
--
-- After that you can log into admin.html and create participants
-- (which provisions their auth user, profile, access code + PIN).
-- ============================================================
