-- 00114: resolve the canonical redirect target for a consolidated (merged) child listing.
--
-- Merged children are deactivated (is_active = false) so RLS hides them from the
-- anon storefront client — which means the product page can't read the child row
-- to discover its merged_into_product_id and 301 to the parent. This SECURITY
-- DEFINER function bypasses RLS to expose ONLY the redirect mapping (nothing else
-- about the hidden row), keyed by a full uuid OR the 13-char "xxxxxxxx-xxxx" SEO
-- id-prefix. Returns the active canonical parent's routing fields, or no rows.

create or replace function public.product_redirect_target(p_key text)
returns table (
  canonical_id   uuid,
  canonical_slug text,
  origin_country text,
  category_path  text
)
language sql
stable
security definer
set search_path = public
as $$
  select c.id, c.slug, c.origin_country, cat.path
  from products ch
  join products c on c.id = ch.merged_into_product_id
  left join categories cat on cat.id = c.category_id
  where ch.merged_into_product_id is not null
    and ch.id::text like p_key || '%'
    and c.is_active = true
    and c.moderation_status = 'approved'
  limit 1;
$$;

grant execute on function public.product_redirect_target(text) to anon, authenticated;
