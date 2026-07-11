-- ============================================================
-- 00103_search_product_ids_brand_filter.sql
--
-- Adds brand filtering to search_product_ids so the marketplace
-- brand filter can combine correctly with origin-country filtering
-- (pagination totals must come from the RPC, not a post-fetch filter).
--
-- Adding a parameter changes the function's signature, so the old
-- 9-arg overload must be dropped explicitly — CREATE OR REPLACE alone
-- would leave both the old and new signatures defined (ambiguous
-- overload) instead of replacing it.
-- ============================================================

drop function if exists search_product_ids(
  uuid[], text[], text, integer, integer, integer, text, integer, integer
);

create function search_product_ids(
  p_category_ids uuid[] default null,
  p_origin_countries text[] default null,
  p_search text default null,
  p_price_min integer default null,
  p_price_max integer default null,
  p_moq_max integer default null,
  p_brands text[] default null,
  p_sort text default 'newest',
  p_limit integer default 20,
  p_offset integer default 0
)
returns table(id uuid, total_count bigint)
language sql
stable
security invoker
as $$
  with filtered as (
    select p.id, p.created_at, p.base_price, p.is_featured
    from products p
    where p.moderation_status = 'approved'
      and p.is_active = true
      and (p_category_ids is null or p.category_id = any(p_category_ids))
      and (p_search is null or p.name ilike '%' || p_search || '%')
      and (p_price_min is null or p.base_price >= p_price_min)
      and (p_price_max is null or p.base_price <= p_price_max)
      and (p_moq_max is null or p.moq <= p_moq_max)
      and (p_brands is null or p.brand = any(p_brands))
      and (
        p_origin_countries is null
        or exists (
          select 1 from products_with_origin pwo
          where pwo.id = p.id and pwo.resolved_country = any(p_origin_countries)
        )
      )
  )
  select f.id, count(*) over() as total_count
  from filtered f
  order by
    case when p_sort = 'price_asc' then f.base_price end asc nulls last,
    case when p_sort = 'price_desc' then f.base_price end desc nulls last,
    case when p_sort = 'popular' then f.is_featured end desc nulls last,
    f.created_at desc
  limit p_limit offset p_offset;
$$;
