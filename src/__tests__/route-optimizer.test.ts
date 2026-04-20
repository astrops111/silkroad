import { describe, it, expect } from "vitest";
import { optimizeRoutes } from "@/lib/logistics/route-optimizer";
import { haversineKm, resolveLocation } from "@/lib/logistics/route-optimizer/geo";

describe("haversineKm", () => {
  it("calculates distance between Nairobi and Mombasa", () => {
    const nairobi = { lat: -1.2921, lng: 36.8219 };
    const mombasa = { lat: -4.0435, lng: 39.6682 };
    const dist = haversineKm(nairobi, mombasa);
    // Straight-line distance ~440km
    expect(dist).toBeGreaterThan(400);
    expect(dist).toBeLessThan(500);
  });

  it("returns 0 for same point", () => {
    const point = { lat: 0, lng: 0 };
    expect(haversineKm(point, point)).toBe(0);
  });
});

describe("resolveLocation", () => {
  it("returns explicit GPS when provided", () => {
    const gps = { lat: 1.5, lng: 32.5 };
    expect(resolveLocation(gps, "SomeCity", "UG")).toEqual(gps);
  });

  it("looks up known city by name + country", () => {
    const loc = resolveLocation(null, "Nairobi", "KE");
    expect(loc).not.toBeNull();
    expect(loc!.lat).toBeCloseTo(-1.2921, 2);
  });

  it("returns null for unknown city", () => {
    expect(resolveLocation(null, "UnknownVillage", "XX")).toBeNull();
  });
});

describe("optimizeRoutes", () => {
  it("handles empty shipments", () => {
    const result = optimizeRoutes({
      warehouseId: "wh1",
      warehouseName: "Test Warehouse",
      warehouseLocation: { lat: -1.2921, lng: 36.8219 },
      date: "2026-04-17",
      strategy: "balanced",
      shipments: [],
      drivers: [],
      vehicles: [],
    });

    expect(result.routes).toHaveLength(0);
    expect(result.total_distance_km).toBe(0);
  });

  it("creates routes for shipments with known cities", () => {
    const result = optimizeRoutes({
      warehouseId: "wh1",
      warehouseName: "Nairobi Hub",
      warehouseLocation: { lat: -1.2921, lng: 36.8219 },
      date: "2026-04-17",
      strategy: "balanced",
      shipments: [
        {
          id: "s1",
          shipment_number: "SHP-001",
          pickup_city: "Nairobi",
          pickup_country: "KE",
          pickup_address: null,
          delivery_city: "Mombasa",
          delivery_country: "KE",
          delivery_address: "123 Coast Rd",
          delivery_gps: null,
          total_weight_kg: 50,
          total_volume_cbm: 0.5,
          package_count: 2,
          is_fragile: false,
          requires_cold_chain: false,
          is_hazardous: false,
          destination_zone_id: null,
          origin_warehouse_id: null,
        },
        {
          id: "s2",
          shipment_number: "SHP-002",
          pickup_city: "Nairobi",
          pickup_country: "KE",
          pickup_address: null,
          delivery_city: "Kisumu",
          delivery_country: "KE",
          delivery_address: "45 Lake Rd",
          delivery_gps: null,
          total_weight_kg: 30,
          total_volume_cbm: 0.3,
          package_count: 1,
          is_fragile: false,
          requires_cold_chain: false,
          is_hazardous: false,
          destination_zone_id: null,
          origin_warehouse_id: null,
        },
      ],
      drivers: [
        {
          id: "d1",
          user_id: "u1",
          full_name: "John Driver",
          phone: "+254700000000",
          warehouse_id: "wh1",
          current_location: null,
          rating: 4.5,
          total_deliveries: 100,
          vehicle_id: null,
        },
      ],
      vehicles: [
        {
          id: "v1",
          registration_number: "KAA 123X",
          vehicle_type: "van",
          capacity_kg: 500,
          capacity_cbm: 5,
          warehouse_id: "wh1",
          current_location: null,
          fuel_type: "diesel",
        },
      ],
    });

    expect(result.routes.length).toBeGreaterThan(0);
    expect(result.total_distance_km).toBeGreaterThan(0);
    expect(result.routes[0].stops.length).toBe(2);
    expect(result.routes[0].assigned_driver_id).toBe("d1");
    expect(result.routes[0].assigned_vehicle_id).toBe("v1");
  });

  it("handles unlocatable shipments", () => {
    const result = optimizeRoutes({
      warehouseId: "wh1",
      warehouseName: "Test",
      warehouseLocation: { lat: 0, lng: 0 },
      date: "2026-04-17",
      strategy: "balanced",
      shipments: [
        {
          id: "s1",
          shipment_number: "SHP-001",
          pickup_city: "Unknown",
          pickup_country: "XX",
          pickup_address: null,
          delivery_city: "NowhereVille",
          delivery_country: "XX",
          delivery_address: null,
          delivery_gps: null,
          total_weight_kg: 10,
          total_volume_cbm: 0.1,
          package_count: 1,
          is_fragile: false,
          requires_cold_chain: false,
          is_hazardous: false,
          destination_zone_id: null,
          origin_warehouse_id: null,
        },
      ],
      drivers: [],
      vehicles: [],
    });

    expect(result.unassigned_shipments).toHaveLength(1);
    expect(result.optimization_notes).toContain("geo-located");
  });
});
