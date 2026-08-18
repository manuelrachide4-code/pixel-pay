ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS product_type text NOT NULL DEFAULT 'ebook',
  ADD COLUMN IF NOT EXISTS file_path text,
  ADD COLUMN IF NOT EXISTS access_url text;

ALTER TABLE public.products
  ADD CONSTRAINT products_product_type_check CHECK (product_type IN ('ebook','curso'));