-- Seed: 001_test_data.sql
-- Insert 3 test profiles with fixed UUIDs
insert into profiles (id, display_name, body_type, color_season, style_aesthetic, budget_range, location)
values
  (
    '00000000-0000-0000-0000-000000000001',
    'Priya Sharma',
    'hourglass',
    'autumn',
    array['ethnic','minimalist'],
    'mid',
    'Mumbai'
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    'Ananya Reddy',
    'pear',
    'summer',
    array['western','boho'],
    'budget',
    'Bengaluru'
  ),
  (
    '00000000-0000-0000-0000-000000000003',
    'Kavya Nair',
    'rectangle',
    'winter',
    array['classic','formal'],
    'premium',
    'Delhi'
  );

-- Insert 10 clothing items for user1 (status='ready')
insert into clothing_items
  (id, user_id, image_url, blurhash, status, type, colors, pattern, fabric_guess,
   occasion, season, style, fit, care_guess)
values
  (
    '10000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'https://storage.tara.app/items/kurta_001.jpg',
    'LKN]Rv%2Tw=w]~RBVZRi',
    'ready', 'kurta',
    array['teal','gold'], 'floral', 'cotton',
    array['festive','casual'], array['summer','all-season'],
    'ethnic', 'relaxed', 'hand wash cold'
  ),
  (
    '10000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    'https://storage.tara.app/items/saree_001.jpg',
    'LPF5?xIU9^kC^*IU%MRj',
    'ready', 'saree',
    array['red','gold'], 'zari', 'silk',
    array['wedding','festive'], array['all-season'],
    'ethnic', 'draped', 'dry clean only'
  ),
  (
    '10000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000001',
    'https://storage.tara.app/items/jeans_001.jpg',
    'L6Pj+M9GIo%g_NRjt7ay',
    'ready', 'jeans',
    array['blue','indigo'], 'solid', 'denim',
    array['casual','daily'], array['winter','all-season'],
    'western', 'slim', 'machine wash cold'
  ),
  (
    '10000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000001',
    'https://storage.tara.app/items/dress_001.jpg',
    'LDG[lx%2Mx_3?bRjWBt6',
    'ready', 'dress',
    array['navy','white'], 'stripes', 'linen',
    array['casual','party'], array['summer','monsoon'],
    'western', 'fit-and-flare', 'machine wash warm'
  ),
  (
    '10000000-0000-0000-0000-000000000005',
    '00000000-0000-0000-0000-000000000001',
    'https://storage.tara.app/items/blazer_001.jpg',
    'L9F;k?9F9FIU~qofM{Rj',
    'ready', 'blazer',
    array['charcoal','black'], 'solid', 'polyester blend',
    array['office','formal'], array['winter','all-season'],
    'formal', 'tailored', 'dry clean only'
  ),
  (
    '10000000-0000-0000-0000-000000000006',
    '00000000-0000-0000-0000-000000000001',
    'https://storage.tara.app/items/top_001.jpg',
    'LBF5k?~q~qt7_NRjIUoy',
    'ready', 'top',
    array['white','ivory'], 'solid', 'cotton',
    array['casual','office','daily'], array['summer','all-season'],
    'western', 'regular', 'machine wash cold'
  ),
  (
    '10000000-0000-0000-0000-000000000007',
    '00000000-0000-0000-0000-000000000001',
    'https://storage.tara.app/items/dupatta_001.jpg',
    'LGF5k?%2IU%g9FRj%Mof',
    'ready', 'dupatta',
    array['magenta','pink'], 'embroidered', 'chiffon',
    array['festive','casual'], array['all-season'],
    'ethnic', 'flowing', 'hand wash cold'
  ),
  (
    '10000000-0000-0000-0000-000000000008',
    '00000000-0000-0000-0000-000000000001',
    'https://storage.tara.app/items/kurta_002.jpg',
    'LCF5k?%2M{%g9FRj%Mof',
    'ready', 'kurta',
    array['mustard','rust'], 'block print', 'cotton',
    array['casual','daily'], array['monsoon','all-season'],
    'ethnic', 'straight', 'machine wash cold'
  ),
  (
    '10000000-0000-0000-0000-000000000009',
    '00000000-0000-0000-0000-000000000001',
    'https://storage.tara.app/items/salwar_001.jpg',
    'LDF5k?%2RB%g9FRj%Mof',
    'ready', 'salwar',
    array['cream','beige'], 'solid', 'cotton',
    array['casual','office','daily'], array['summer','all-season'],
    'ethnic', 'relaxed', 'machine wash cold'
  ),
  (
    '10000000-0000-0000-0000-000000000010',
    '00000000-0000-0000-0000-000000000001',
    'https://storage.tara.app/items/top_002.jpg',
    'LEF5k?%2t7%g9FRj%Mof',
    'ready', 'top',
    array['olive','khaki'], 'solid', 'jersey',
    array['casual','sports','daily'], array['all-season'],
    'streetwear', 'oversized', 'machine wash cold'
  );

-- Insert 2 outfits for user1
insert into outfits (id, user_id, item_ids, occasion, ai_generated, liked)
values
  (
    '20000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    array[
      '10000000-0000-0000-0000-000000000001'::uuid,
      '10000000-0000-0000-0000-000000000007'::uuid,
      '10000000-0000-0000-0000-000000000009'::uuid
    ],
    'festive',
    true,
    true
  ),
  (
    '20000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    array[
      '10000000-0000-0000-0000-000000000005'::uuid,
      '10000000-0000-0000-0000-000000000006'::uuid,
      '10000000-0000-0000-0000-000000000003'::uuid
    ],
    'office',
    true,
    false
  );
