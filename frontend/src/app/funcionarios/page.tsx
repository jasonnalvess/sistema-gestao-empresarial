"use client";
import { PageHeader } from "@/components/common/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RhScope } from "@/components/funcionarios/RhShared";
import { FuncionariosLista } from "@/components/funcionarios/FuncionariosLista";
import { EstruturaLista } from "@/components/funcionarios/EstruturaLista";
export default function FuncionariosPage() {
  return (
    <RhScope>
      {(empresa) => (
        <div className="min-w-0 max-w-full space-y-6 [overflow-wrap:anywhere]">
          <PageHeader
            title="Funcionários"
            description="Cadastros, estrutura e acompanhamento dos colaboradores."
          />
          <Tabs defaultValue="funcionarios">
            <TabsList
              className="min-w-0 max-w-full shrink-0 overflow-x-auto overscroll-x-contain [&>button]:flex-none"
              aria-label="Áreas do RH"
            >
              <TabsTrigger value="funcionarios">Funcionários</TabsTrigger>
              <TabsTrigger value="cargos">Cargos</TabsTrigger>
              <TabsTrigger value="departamentos">Departamentos</TabsTrigger>
            </TabsList>
            <TabsContent value="funcionarios">
              <FuncionariosLista empresa={empresa} />
            </TabsContent>
            <TabsContent value="cargos">
              <EstruturaLista empresa={empresa} tipo="cargos" />
            </TabsContent>
            <TabsContent value="departamentos">
              <EstruturaLista empresa={empresa} tipo="departamentos" />
            </TabsContent>
          </Tabs>
        </div>
      )}
    </RhScope>
  );
}
