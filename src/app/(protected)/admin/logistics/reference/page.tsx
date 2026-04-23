import {
  listFreightLanes,
  listPortCountries,
  listPorts,
  listTariffRates,
} from "@/lib/queries/logistics-reference";
import { listDocumentRequirements } from "@/lib/queries/document-requirements";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PortsManager } from "@/components/admin/logistics/PortsManager";
import { FreightLanesManager } from "@/components/admin/logistics/FreightLanesManager";
import { TariffRatesManager } from "@/components/admin/logistics/TariffRatesManager";
import { DocumentRequirementsManager } from "@/components/admin/logistics/DocumentRequirementsManager";

export const dynamic = "force-dynamic";

export default async function LogisticsReferencePage() {
  const [ports, lanes, tariffs, portCountries, docReqs] = await Promise.all([
    listPorts({ includeInactive: true }),
    listFreightLanes({ includeInactive: true }),
    listTariffRates({ includeInactive: true }),
    listPortCountries(),
    listDocumentRequirements({ includeInactive: true }),
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
          Ports, freight lanes, and tariff rates that the landed-cost engine reads from. Internal — ops view.
        </p>
      </div>

      <Tabs defaultValue="ports">
        <TabsList>
          <TabsTrigger value="ports">Ports ({ports.length})</TabsTrigger>
          <TabsTrigger value="lanes">Freight lanes ({lanes.length})</TabsTrigger>
          <TabsTrigger value="tariffs">Tariff rates ({tariffs.length})</TabsTrigger>
          <TabsTrigger value="docs">Doc requirements ({docReqs.length})</TabsTrigger>
        </TabsList>

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
