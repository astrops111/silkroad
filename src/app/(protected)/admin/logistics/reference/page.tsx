import {
  listFreightLanes,
  listOriginsMissingRateCards,
  listPortCountries,
  listPorts,
  listShippingRates,
  listTariffRates,
  type RateSource,
} from "@/lib/queries/logistics-reference";
import { listDocumentRequirements } from "@/lib/queries/document-requirements";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PortsManager } from "@/components/admin/logistics/PortsManager";
import { FreightLanesManager } from "@/components/admin/logistics/FreightLanesManager";
import { TariffRatesManager } from "@/components/admin/logistics/TariffRatesManager";
import { DocumentRequirementsManager } from "@/components/admin/logistics/DocumentRequirementsManager";
import { BSAManager } from "@/components/admin/logistics/BSAManager";
import { ShippingRatesManager } from "@/components/admin/logistics/ShippingRatesManager";

export const dynamic = "force-dynamic";

export default async function LogisticsReferencePage() {
  const [ports, lanes, bsaLanes, tariffs, portCountries, docReqs, shippingRates, missingRateCards] =
    await Promise.all([
      listPorts({ includeInactive: true }),
      listFreightLanes({ includeInactive: true }),
      listFreightLanes({ source: "bsa" as RateSource, includeInactive: true }),
      listTariffRates({ includeInactive: true }),
      listPortCountries(),
      listDocumentRequirements({ includeInactive: true }),
      listShippingRates({ includeInactive: true }),
      listOriginsMissingRateCards(),
    ]);

  return (
    <div className="space-y-6">
      <div>
        <h1
          className="text-2xl font-bold text-[var(--obsidian)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Logistics reference data
        </h1>
        <p className="mt-1 text-sm text-[var(--text-tertiary)]">
          Shipping rate cards that checkout charges from, plus the ports, freight lanes, tariff rates, and BSA contracts the landed-cost engine reads. Internal — ops view.
        </p>
      </div>

      <Tabs defaultValue="shipping">
        <TabsList>
          <TabsTrigger value="shipping">
            Shipping rates ({shippingRates.length})
            {missingRateCards.length > 0 && (
              <span className="ml-1.5 rounded-full bg-[var(--amber)]/25 px-1.5 text-[10px] font-semibold text-[var(--amber-dark)]">
                {missingRateCards.length} missing
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="bsa">BSA contracts ({bsaLanes.length})</TabsTrigger>
          <TabsTrigger value="ports">Ports ({ports.length})</TabsTrigger>
          <TabsTrigger value="lanes">Market lanes ({lanes.length})</TabsTrigger>
          <TabsTrigger value="tariffs">Tariff rates ({tariffs.length})</TabsTrigger>
          <TabsTrigger value="docs">Doc requirements ({docReqs.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="shipping" className="mt-4">
          <ShippingRatesManager
            initialRates={shippingRates}
            missingRateCards={missingRateCards}
          />
        </TabsContent>
        <TabsContent value="bsa" className="mt-4">
          <BSAManager initialLanes={bsaLanes} ports={ports} />
        </TabsContent>
        <TabsContent value="ports" className="mt-4">
          <PortsManager initialPorts={ports} />
        </TabsContent>
        <TabsContent value="lanes" className="mt-4">
          <FreightLanesManager initialLanes={lanes} ports={ports} />
        </TabsContent>
        <TabsContent value="tariffs" className="mt-4">
          <TariffRatesManager initialTariffs={tariffs} portCountries={portCountries} />
        </TabsContent>
        <TabsContent value="docs" className="mt-4">
          <DocumentRequirementsManager initialRows={docReqs} portCountries={portCountries} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
