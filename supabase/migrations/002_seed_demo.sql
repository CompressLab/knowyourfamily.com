-- ============================================================
-- FamilyTree — Demo seed data (development only)
-- Synthetic data — no real personal information
-- Run AFTER 001_initial_schema.sql
-- ============================================================

-- IMPORTANT: These are fake, synthetic people for testing.
-- Do NOT use real government IDs, real addresses, or real phone numbers.

do $$
declare
  -- Person IDs
  id_ibrahim  uuid := '11111111-0000-0000-0000-000000000001';
  id_fatima   uuid := '11111111-0000-0000-0000-000000000002';
  id_ahmed    uuid := '11111111-0000-0000-0000-000000000003';
  id_layla    uuid := '11111111-0000-0000-0000-000000000004';
  id_azeem    uuid := '11111111-0000-0000-0000-000000000005';  -- "Me" — will get real user account
  id_sara     uuid := '11111111-0000-0000-0000-000000000006';
  id_omar     uuid := '11111111-0000-0000-0000-000000000007';
  id_nadia    uuid := '11111111-0000-0000-0000-000000000008';
  id_karim    uuid := '11111111-0000-0000-0000-000000000009';
  id_yusuf    uuid := '11111111-0000-0000-0000-000000000010';
  id_hana     uuid := '11111111-0000-0000-0000-000000000011';
  id_rahman   uuid := '11111111-0000-0000-0000-000000000012';  -- Friend "Like a Brother"
  id_sameer   uuid := '11111111-0000-0000-0000-000000000013';  -- Friend
  id_amina    uuid := '11111111-0000-0000-0000-000000000014';
begin

  -- ──────────────────────────────────────────────
  -- PEOPLE (no user_id = no account)
  -- ──────────────────────────────────────────────

  insert into public.people (id, full_name, short_bio, user_id, discoverable_by_name, past_photo_period) values
    -- Great-grandfather (no account)
    (id_ibrahim, 'Ibrahim Hassan Al-Rashid', 'Born in 1925, a respected elder and merchant. Lived in Hyderabad his whole life.', null, true, 'Around 1960'),

    -- Great-grandmother (no account)
    (id_fatima, 'Fatima Begum', 'Loved cooking and storytelling. Known for her warmth and wisdom.', null, true, 'Around 1965'),

    -- Grandfather (no account)
    (id_ahmed, 'Ahmed Ibrahim Al-Rashid', 'Retired schoolteacher. Passionate about history and cricket.', null, true, 'Around 1985'),

    -- Grandmother (no account)
    (id_layla, 'Layla Mohammed', 'A gentle soul who raised seven children. Loves gardening.', null, true, 'Around 1990'),

    -- Me — Azeem (account will be linked by real user at registration)
    (id_azeem, 'Mohammed Azeem Al-Rashid', 'Building this family tree for our whole family to share.', null, true, null),

    -- Sister
    (id_sara, 'Sara Al-Rashid', 'Medical student. Younger sister of Azeem.', null, true, null),

    -- Uncle (no account)
    (id_omar, 'Omar Ibrahim Al-Rashid', 'Software engineer in Dubai. Uncle of Azeem.', null, true, null),

    -- Aunt (no account)
    (id_nadia, 'Nadia Ibrahim', 'Teacher. Married to Omar. Lives in Dubai.', null, true, null),

    -- Cousin (no account)
    (id_karim, 'Karim Omar Al-Rashid', 'Studying engineering. First cousin of Azeem.', null, true, null),

    -- Son (child — no account, too young)
    (id_yusuf, 'Yusuf Azeem Al-Rashid', 'Azeem''s young son. Born 2018.', null, false, null),

    -- Daughter (child — no account)
    (id_hana, 'Hana Azeem Al-Rashid', 'Azeem''s daughter. Born 2021.', null, false, null),

    -- Friend "Like a Brother" (no account)
    (id_rahman, 'Abdul Rahman Khan', 'Childhood friend of Azeem. Like a brother.', null, true, null),

    -- Friend (no account)
    (id_sameer, 'Sameer Shaikh', 'University friend of Azeem.', null, true, null),

    -- Mother (no account)
    (id_amina, 'Amina Ibrahim Al-Rashid', 'Homemaker and devoted mother. Loves reading and cooking.', null, true, 'Early 2000s')

  on conflict (id) do nothing;

  -- ──────────────────────────────────────────────
  -- FAMILY RELATIONSHIPS (all accepted)
  -- ──────────────────────────────────────────────

  insert into public.relationships
    (person_a_id, person_b_id, relationship_type, status, requested_by_person_id)
  values
    -- Great-grandparents → Grandfather
    (id_ibrahim, id_ahmed, 'parent', 'accepted', id_ibrahim),
    (id_fatima, id_ahmed, 'parent', 'accepted', id_fatima),

    -- Ibrahim & Fatima are spouses
    (id_ibrahim, id_fatima, 'spouse', 'accepted', id_ibrahim),

    -- Grandfather → Father (Ahmed → id_azeem's father; we use Azeem as "Me" for demo)
    -- In demo: Ahmed is grandfather of Azeem
    -- Azeem's father is not in seed for simplicity; Ahmed is his grandfather
    (id_ahmed, id_azeem, 'grandparent', 'accepted', id_ahmed),
    (id_layla, id_azeem, 'grandparent', 'accepted', id_layla),

    -- Ahmed & Layla are spouses
    (id_ahmed, id_layla, 'spouse', 'accepted', id_ahmed),

    -- Amina is Azeem's mother
    (id_amina, id_azeem, 'parent', 'accepted', id_amina),

    -- Omar is Ahmed's son (uncle of Azeem)
    (id_ahmed, id_omar, 'parent', 'accepted', id_ahmed),
    (id_azeem, id_omar, 'uncle', 'accepted', id_azeem),

    -- Nadia is Omar's spouse
    (id_omar, id_nadia, 'spouse', 'accepted', id_omar),

    -- Karim is Omar's child (cousin of Azeem)
    (id_omar, id_karim, 'parent', 'accepted', id_omar),
    (id_azeem, id_karim, 'cousin', 'accepted', id_azeem),

    -- Sara is Azeem's sister
    (id_azeem, id_sara, 'sibling', 'accepted', id_azeem),

    -- Yusuf and Hana are Azeem's children
    (id_azeem, id_yusuf, 'parent', 'accepted', id_azeem),
    (id_azeem, id_hana, 'parent', 'accepted', id_azeem)

  on conflict (person_a_id, person_b_id) do nothing;

  -- ──────────────────────────────────────────────
  -- FRIEND CONNECTIONS
  -- ──────────────────────────────────────────────

  insert into public.friend_connections
    (person_a_id, person_b_id, label, custom_label, status, requested_by_person_id)
  values
    (id_azeem, id_rahman, 'like_a_brother', null, 'accepted', id_azeem),
    (id_azeem, id_sameer, 'friend', null, 'accepted', id_azeem)

  on conflict (person_a_id, person_b_id) do nothing;

  -- ──────────────────────────────────────────────
  -- PROFILE MANAGERS
  -- (Azeem manages profiles for his children since they have no accounts)
  -- ──────────────────────────────────────────────

  insert into public.profile_managers (person_id, manager_person_id, granted_by_person_id) values
    (id_yusuf, id_azeem, id_azeem),
    (id_hana, id_azeem, id_azeem)

  on conflict (person_id, manager_person_id) do nothing;

  -- ──────────────────────────────────────────────
  -- NOTE: Documents are NOT seeded here.
  -- Real document upload requires actual files in Supabase Storage.
  -- Upload documents manually after setup for testing.
  -- ──────────────────────────────────────────────

end $$;
