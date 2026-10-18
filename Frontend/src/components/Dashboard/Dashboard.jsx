"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Link } from "react-router-dom"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "../ui/card"

import DashboardStats from "./Charts/DashboardStats"
import AppointmentsChart from "./Charts/AppointmentsChart"
import SalesChart from "./Charts/SalesChart"
import ServicesChart from "./Charts/ServicesChart"
import AppointmentsTable from "./AppointmentsTable"

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState("charts")

  return (
    
    <div className="space-y-6">
      
      <div>
        <h1 className="pagina-titulo" style={{ marginBottom: "0.25rem" }}>Resumen del spa</h1>
        <p className="text-muted-foreground">Ingresos, citas y clientes de este mes comparados con el anterior.</p>
      </div>

      {/* Stats cards */}
      <DashboardStats />

      {/* Tabs */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex space-x-1 rounded-lg bg-muted/50 p-1">
            <button
              className={`px-3 py-1.5 text-sm font-medium rounded-md ${
                activeTab === "charts" ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"
              }`}
              onClick={() => setActiveTab("charts")}
            >
              Gráficos
            </button>
            <button
              className={`px-3 py-1.5 text-sm font-medium rounded-md ${
                activeTab === "appointments" ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"
              }`}
              onClick={() => setActiveTab("appointments")}
            >
              Citas del Día
            </button>
          </div>
        </div>

        {/* Charts content */}
        {activeTab === "charts" && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <motion.div
              className="col-span-1 md:col-span-2 lg:col-span-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div className="flex flex-col space-y-1">
                    <CardTitle>Comportamiento de Citas</CardTitle>
                    <CardDescription>Tendencia de citas agendadas</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="pb-4">
                  <div className="h-[300px]">
                    <AppointmentsChart />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card className="overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div className="flex flex-col space-y-1">
                    <CardTitle>Servicios por Empleado</CardTitle>
                    <CardDescription>Distribución de servicios realizados</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="pb-4">
                  <div className="h-[300px]">
                    <ServicesChart />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              className="col-span-1 md:col-span-2 lg:col-span-3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <div className="flex flex-col space-y-1">
                    <CardTitle>Ventas Mensuales</CardTitle>
                    <CardDescription>Ingresos del negocio</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="pb-4">
                  <div className="h-[300px]">
                    <SalesChart />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        )}

        {/* Appointments content */}
        {activeTab === "appointments" && (
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle>Citas del Día</CardTitle>
              <CardDescription>Listado de citas programadas para hoy</CardDescription>
            </CardHeader>
            <CardContent>
              <AppointmentsTable />
            </CardContent>
            <CardFooter className="flex justify-end">
              <Link to="/citas" className="btn btn-secondary">
                Ver todas las citas
              </Link>
            </CardFooter>
          </Card>
        )}
      </div>
    </div>
  )
}

export default Dashboard
