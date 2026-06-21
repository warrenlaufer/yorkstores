-- Optional: migrate existing drops from the old flat coin categories
-- into the new "Coins" category with the matching subcategory.
-- Run AFTER `prisma db push` (which adds the subcategory column).
UPDATE "Drop" SET category = 'Coins', subcategory = 'Certified Coins'  WHERE category = 'Certified Coins';
UPDATE "Drop" SET category = 'Coins', subcategory = 'Collectible Coins' WHERE category = 'Collectible Coins';
