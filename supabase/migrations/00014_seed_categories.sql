-- ============================================================
-- 00014_seed_categories.sql — Hierarchical category tree
-- ============================================================

-- Top-level categories
INSERT INTO categories (id, name, slug, level, path, icon, sort_order) VALUES
  ('11111111-0001-0000-0000-000000000000', 'Electronics & Technology', 'electronics', 0, 'electronics', 'Cpu', 1),
  ('11111111-0002-0000-0000-000000000000', 'Machinery & Equipment', 'machinery', 0, 'machinery', 'Wrench', 2),
  ('11111111-0003-0000-0000-000000000000', 'Textiles & Apparel', 'textiles', 0, 'textiles', 'Shirt', 3),
  ('11111111-0004-0000-0000-000000000000', 'Construction & Building Materials', 'construction', 0, 'construction', 'Building2', 4),
  ('11111111-0005-0000-0000-000000000000', 'Agriculture & Food', 'agriculture', 0, 'agriculture', 'Wheat', 5),
  ('11111111-0006-0000-0000-000000000000', 'Minerals & Raw Materials', 'minerals', 0, 'minerals', 'Mountain', 6),
  ('11111111-0007-0000-0000-000000000000', 'Energy & Solar', 'energy', 0, 'energy', 'Sun', 7),
  ('11111111-0008-0000-0000-000000000000', 'Consumer Goods', 'consumer-goods', 0, 'consumer-goods', 'ShoppingBag', 8),
  ('11111111-0009-0000-0000-000000000000', 'Automotive & Transport', 'automotive', 0, 'automotive', 'Truck', 9),
  ('11111111-0010-0000-0000-000000000000', 'Chemicals & Pharmaceuticals', 'chemicals', 0, 'chemicals', 'FlaskConical', 10);

-- Electronics subcategories
INSERT INTO categories (parent_id, name, slug, level, path, sort_order) VALUES
  ('11111111-0001-0000-0000-000000000000', 'Solar Panels & Inverters', 'solar-panels', 1, 'electronics/solar-panels', 1),
  ('11111111-0001-0000-0000-000000000000', 'LED Lighting', 'led-lighting', 1, 'electronics/led-lighting', 2),
  ('11111111-0001-0000-0000-000000000000', 'Mobile Phones & Accessories', 'mobile-phones', 1, 'electronics/mobile-phones', 3),
  ('11111111-0001-0000-0000-000000000000', 'Computers & Networking', 'computers', 1, 'electronics/computers', 4),
  ('11111111-0001-0000-0000-000000000000', 'Consumer Electronics', 'consumer-electronics', 1, 'electronics/consumer-electronics', 5),
  ('11111111-0001-0000-0000-000000000000', 'Electronic Components', 'electronic-components', 1, 'electronics/electronic-components', 6);

-- Machinery subcategories
INSERT INTO categories (parent_id, name, slug, level, path, sort_order) VALUES
  ('11111111-0002-0000-0000-000000000000', 'CNC & Precision Machines', 'cnc-machines', 1, 'machinery/cnc-machines', 1),
  ('11111111-0002-0000-0000-000000000000', 'Agricultural Machinery', 'agri-machinery', 1, 'machinery/agri-machinery', 2),
  ('11111111-0002-0000-0000-000000000000', 'Packaging Machinery', 'packaging-machinery', 1, 'machinery/packaging-machinery', 3),
  ('11111111-0002-0000-0000-000000000000', 'Mining Equipment', 'mining-equipment', 1, 'machinery/mining-equipment', 4),
  ('11111111-0002-0000-0000-000000000000', 'Generators & Power', 'generators', 1, 'machinery/generators', 5),
  ('11111111-0002-0000-0000-000000000000', 'Water Treatment', 'water-treatment', 1, 'machinery/water-treatment', 6);

-- Textiles subcategories
INSERT INTO categories (parent_id, name, slug, level, path, sort_order) VALUES
  ('11111111-0003-0000-0000-000000000000', 'Fabrics & Textiles', 'fabrics', 1, 'textiles/fabrics', 1),
  ('11111111-0003-0000-0000-000000000000', 'Garments & Apparel', 'garments', 1, 'textiles/garments', 2),
  ('11111111-0003-0000-0000-000000000000', 'Footwear', 'footwear', 1, 'textiles/footwear', 3),
  ('11111111-0003-0000-0000-000000000000', 'Uniforms & Workwear', 'uniforms', 1, 'textiles/uniforms', 4);

-- Construction subcategories
INSERT INTO categories (parent_id, name, slug, level, path, sort_order) VALUES
  ('11111111-0004-0000-0000-000000000000', 'Steel & Metal Products', 'steel', 1, 'construction/steel', 1),
  ('11111111-0004-0000-0000-000000000000', 'Cement & Concrete', 'cement', 1, 'construction/cement', 2),
  ('11111111-0004-0000-0000-000000000000', 'Tiles & Sanitary Ware', 'tiles', 1, 'construction/tiles', 3),
  ('11111111-0004-0000-0000-000000000000', 'Pipes & Fittings', 'pipes', 1, 'construction/pipes', 4),
  ('11111111-0004-0000-0000-000000000000', 'Paint & Coatings', 'paint', 1, 'construction/paint', 5);

-- Agriculture subcategories
INSERT INTO categories (parent_id, name, slug, level, path, sort_order) VALUES
  ('11111111-0005-0000-0000-000000000000', 'Coffee & Tea', 'coffee-tea', 1, 'agriculture/coffee-tea', 1),
  ('11111111-0005-0000-0000-000000000000', 'Cocoa & Chocolate', 'cocoa', 1, 'agriculture/cocoa', 2),
  ('11111111-0005-0000-0000-000000000000', 'Grains & Cereals', 'grains', 1, 'agriculture/grains', 3),
  ('11111111-0005-0000-0000-000000000000', 'Spices & Herbs', 'spices', 1, 'agriculture/spices', 4),
  ('11111111-0005-0000-0000-000000000000', 'Nuts & Seeds', 'nuts-seeds', 1, 'agriculture/nuts-seeds', 5),
  ('11111111-0005-0000-0000-000000000000', 'Fertilizers & Agri-inputs', 'fertilizers', 1, 'agriculture/fertilizers', 6);

-- Minerals subcategories
INSERT INTO categories (parent_id, name, slug, level, path, sort_order) VALUES
  ('11111111-0006-0000-0000-000000000000', 'Gold & Precious Metals', 'gold', 1, 'minerals/gold', 1),
  ('11111111-0006-0000-0000-000000000000', 'Copper & Base Metals', 'copper', 1, 'minerals/copper', 2),
  ('11111111-0006-0000-0000-000000000000', 'Iron Ore & Steel Scrap', 'iron-ore', 1, 'minerals/iron-ore', 3),
  ('11111111-0006-0000-0000-000000000000', 'Timber & Wood Products', 'timber', 1, 'minerals/timber', 4);
