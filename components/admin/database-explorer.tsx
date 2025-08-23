"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Database, RefreshCw, Search, Table as TableIcon } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"

interface TableInfo {
  name: string
  count: number
  columns: string[]
}

export function DatabaseExplorer() {
  const [tables, setTables] = useState<TableInfo[]>([])
  const [selectedTable, setSelectedTable] = useState<string>("")
  const [searchTerm, setSearchTerm] = useState("")
  const [queryResult, setQueryResult] = useState<any[]>([])
  const [customQuery, setCustomQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    fetchTables()
  }, [])

  const fetchTables = async () => {
    try {
      const response = await fetch("/api/admin/database/tables")
      const data = await response.json()
      setTables(data.tables || [])
    } catch (err) {
      setError("Failed to fetch tables")
    }
  }

  const fetchTableData = async (tableName: string) => {
    setLoading(true)
    setError("")
    try {
      const response = await fetch(`/api/admin/database/query`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          query: `SELECT * FROM "${tableName}" ORDER BY "createdAt" DESC LIMIT 100`
        })
      })
      
      if (!response.ok) {
        throw new Error("Failed to fetch data")
      }
      
      const data = await response.json()
      setQueryResult(data.results || [])
      setSelectedTable(tableName)
    } catch (err) {
      setError("Failed to fetch table data")
    } finally {
      setLoading(false)
    }
  }

  const executeCustomQuery = async () => {
    if (!customQuery.trim()) return
    
    setLoading(true)
    setError("")
    try {
      const response = await fetch(`/api/admin/database/query`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          query: customQuery
        })
      })
      
      if (!response.ok) {
        throw new Error("Query failed")
      }
      
      const data = await response.json()
      setQueryResult(data.results || [])
      setSelectedTable("Custom Query")
    } catch (err) {
      setError("Query execution failed")
    } finally {
      setLoading(false)
    }
  }

  const filteredTables = tables.filter(table =>
    table.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="grid gap-6 md:grid-cols-4">
      <div className="md:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Tables
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tables..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <div className="space-y-2 max-h-[400px] overflow-auto">
              {filteredTables.map((table) => (
                <Button
                  key={table.name}
                  variant={selectedTable === table.name ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => fetchTableData(table.name)}
                  disabled={loading}
                >
                  <TableIcon className="mr-2 h-4 w-4" />
                  <div className="flex-1 text-left">
                    <div>{table.name}</div>
                    <Badge variant="secondary" className="text-xs">
                      {table.count} rows
                    </Badge>
                  </div>
                </Button>
              ))}
            </div>
            
            <Button
              onClick={fetchTables}
              variant="outline"
              size="sm"
              className="w-full"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="md:col-span-3 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Custom Query</CardTitle>
            <CardDescription>
              Execute custom SQL queries (SELECT only for security)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="SELECT * FROM users WHERE role = 'ADMIN'..."
              value={customQuery}
              onChange={(e) => setCustomQuery(e.target.value)}
              rows={4}
            />
            <Button onClick={executeCustomQuery} disabled={loading}>
              Execute Query
            </Button>
          </CardContent>
        </Card>

        {error && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-red-600">{error}</div>
            </CardContent>
          </Card>
        )}

        {queryResult.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>
                Results: {selectedTable}
                {loading && <RefreshCw className="ml-2 h-4 w-4 animate-spin inline" />}
              </CardTitle>
              <CardDescription>
                Showing {queryResult.length} rows
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-auto max-h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {Object.keys(queryResult[0] || {}).map((column) => (
                        <TableHead key={column}>{column}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {queryResult.map((row, index) => (
                      <TableRow key={index}>
                        {Object.entries(row).map(([key, value]) => (
                          <TableCell key={key} className="max-w-[200px]">
                            <div className="truncate">
                              {value === null ? (
                                <span className="text-muted-foreground">null</span>
                              ) : typeof value === 'object' ? (
                                <Badge variant="outline">JSON</Badge>
                              ) : (
                                String(value)
                              )}
                            </div>
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}