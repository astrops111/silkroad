import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/addresses — List user's addresses
 * Query: companyId? (optional, defaults to user's personal addresses)
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("id")
    .eq("auth_id", user.id)
    .single();

  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const companyId = request.nextUrl.searchParams.get("companyId");

  let query = supabase
    .from("addresses")
    .select("*")
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });

  if (companyId) {
    query = query.eq("company_id", companyId);
  } else {
    query = query.eq("user_id", profile.id);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[addresses] fetch failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
  return NextResponse.json({ addresses: data || [] });
}

/**
 * POST /api/addresses — Create a new address
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("id")
    .eq("auth_id", user.id)
    .single();

  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const body = await request.json();
  const {
    companyId,
    label,
    recipientName,
    phone,
    addressLine1,
    addressLine2,
    city,
    stateProvince,
    postalCode,
    countryCode,
    landmark,
    gpsCoordinates,
    isDefault,
  } = body;

  if (!recipientName || !addressLine1 || !city || !countryCode) {
    return NextResponse.json(
      { error: "recipientName, addressLine1, city, and countryCode are required" },
      { status: 400 }
    );
  }

  // H14: If a companyId is provided, verify the caller is a member of that company
  if (companyId) {
    const { data: membership } = await supabase
      .from("company_members")
      .select("id")
      .eq("user_id", profile.id)
      .eq("company_id", companyId)
      .maybeSingle();
    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  // If setting as default, unset other defaults
  if (isDefault) {
    const filterCol = companyId ? "company_id" : "user_id";
    const filterVal = companyId || profile.id;
    await supabase
      .from("addresses")
      .update({ is_default: false })
      .eq(filterCol, filterVal);
  }

  const { data, error } = await supabase
    .from("addresses")
    .insert({
      user_id: companyId ? null : profile.id,
      company_id: companyId || null,
      label: label || null,
      recipient_name: recipientName,
      phone: phone || null,
      address_line_1: addressLine1,
      address_line_2: addressLine2 || null,
      city,
      state_province: stateProvince || null,
      postal_code: postalCode || null,
      country_code: countryCode,
      landmark: landmark || null,
      gps_coordinates: gpsCoordinates || null,
      is_default: isDefault || false,
    })
    .select("id")
    .single();

  if (error) {
    console.error('[addresses] insert failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
  return NextResponse.json({ success: true, addressId: data.id });
}

/**
 * PATCH /api/addresses — Update an address
 * Body: { addressId, ...fields }
 */
export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("id")
    .eq("auth_id", user.id)
    .single();
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const body = await request.json();
  const { addressId, ...updates } = body;

  if (!addressId) {
    return NextResponse.json({ error: "addressId required" }, { status: 400 });
  }

  // C9: Fetch the address first to verify ownership
  const { data: existingAddress } = await supabase
    .from("addresses")
    .select("id, user_id, company_id")
    .eq("id", addressId)
    .maybeSingle();

  if (!existingAddress) {
    return NextResponse.json({ error: "Address not found" }, { status: 404 });
  }

  // Ownership check: caller must own the address directly or be a member of its company
  if (existingAddress.company_id) {
    const { data: membership } = await supabase
      .from("company_members")
      .select("id")
      .eq("user_id", profile.id)
      .eq("company_id", existingAddress.company_id)
      .maybeSingle();
    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else if (existingAddress.user_id !== profile.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updateData: Record<string, unknown> = {};
  if (updates.label !== undefined) updateData.label = updates.label;
  if (updates.recipientName !== undefined) updateData.recipient_name = updates.recipientName;
  if (updates.phone !== undefined) updateData.phone = updates.phone;
  if (updates.addressLine1 !== undefined) updateData.address_line_1 = updates.addressLine1;
  if (updates.addressLine2 !== undefined) updateData.address_line_2 = updates.addressLine2;
  if (updates.city !== undefined) updateData.city = updates.city;
  if (updates.stateProvince !== undefined) updateData.state_province = updates.stateProvince;
  if (updates.postalCode !== undefined) updateData.postal_code = updates.postalCode;
  if (updates.countryCode !== undefined) updateData.country_code = updates.countryCode;
  if (updates.landmark !== undefined) updateData.landmark = updates.landmark;
  if (updates.isDefault !== undefined) updateData.is_default = updates.isDefault;

  const { error } = await supabase
    .from("addresses")
    .update(updateData)
    .eq("id", addressId);

  if (error) {
    console.error('[addresses] update failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}

/**
 * DELETE /api/addresses — Delete an address
 * Body: { addressId }
 */
export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("id")
    .eq("auth_id", user.id)
    .single();
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const { addressId } = await request.json();
  if (!addressId) {
    return NextResponse.json({ error: "addressId required" }, { status: 400 });
  }

  // C9: Verify ownership before deletion
  const { data: existingAddress } = await supabase
    .from("addresses")
    .select("id, user_id, company_id")
    .eq("id", addressId)
    .maybeSingle();

  if (!existingAddress) {
    return NextResponse.json({ error: "Address not found" }, { status: 404 });
  }

  if (existingAddress.company_id) {
    const { data: membership } = await supabase
      .from("company_members")
      .select("id")
      .eq("user_id", profile.id)
      .eq("company_id", existingAddress.company_id)
      .maybeSingle();
    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else if (existingAddress.user_id !== profile.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await supabase.from("addresses").delete().eq("id", addressId);
  if (error) {
    console.error('[addresses] delete failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
