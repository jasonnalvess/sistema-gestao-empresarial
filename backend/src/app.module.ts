import { Module } from '@nestjs/common';
import { RespostaInterceptor } from './common/interceptors/resposta.interceptor';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { EmpresasModule } from './empresas/empresas.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { AuthModule } from './auth/auth.module';
import { ModulosModule } from './modulos/modulos.module';
import { EmpresaModulosModule } from './empresa-modulos/empresa-modulos.module';
import { CategoriasProdutosModule } from './categorias-produtos/categorias-produtos.module';
import { ProdutosModule } from './produtos/produtos.module';
import { EstoqueModule } from './estoque/estoque.module';
import { MovimentacoesEstoqueModule } from './movimentacoes-estoque/movimentacoes-estoque.module';
import { AuditoriaModule } from './auditoria/auditoria.module';
import { AuditoriaInterceptor } from './common/interceptors/auditoria.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { DashboardModule } from './dashboard/dashboard.module';
import { AgendaModule } from './agenda/agenda.module';
import { ClientesModule } from './clientes/clientes.module';
import { OrdensServicoModule } from './ordens-servico/ordens-servico.module';
import { UnidadesMedidaModule } from './unidades-medida/unidades-medida.module';
import { MarcasProdutosModule } from './marcas-produtos/marcas-produtos.module';
import { DepositosModule } from './depositos/depositos.module';
import { InventariosEstoqueModule } from './inventarios-estoque/inventarios-estoque.module';
import { FornecedoresModule } from './fornecedores/fornecedores.module';
import { PedidosCompraModule } from './pedidos-compra/pedidos-compra.module';
import { ContasPagarModule } from './contas-pagar/contas-pagar.module';
import { ContasReceberModule } from './contas-receber/contas-receber.module';
import { FinanceiroModule } from './financeiro/financeiro.module';
import { CaixasModule } from './caixas/caixas.module';
import { VendasModule } from './vendas/vendas.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '../.env',
      isGlobal: true,
    }),
    PrismaModule,
    EmpresasModule,
    UsuariosModule,
    AuthModule,
    ModulosModule,
    EmpresaModulosModule,
    CategoriasProdutosModule,
    ProdutosModule,
    EstoqueModule,
    MovimentacoesEstoqueModule,
    AuditoriaModule,
    DashboardModule,
    AgendaModule,
    ClientesModule,
    OrdensServicoModule,
    UnidadesMedidaModule,
    MarcasProdutosModule,
    DepositosModule,
    InventariosEstoqueModule,
    FornecedoresModule,
    PedidosCompraModule,
    ContasPagarModule,
    ContasReceberModule,
    FinanceiroModule,
    CaixasModule,
    VendasModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditoriaInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: RespostaInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule {}
