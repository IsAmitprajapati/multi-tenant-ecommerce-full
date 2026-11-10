import { useState } from "react"
import { useTable, type ColumnDef, type RowData } from "@tanstack/react-table"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { Button } from "../ui/button"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { features, type DataTableFeatures } from "./data-table-features"
import { cn } from "@/lib/utils"
import { Spinner } from "../ui/spinner"

interface DataTableProps<TData extends RowData> {
  columns: ColumnDef<DataTableFeatures, TData>[]
  data: TData[]
  isLoading?: boolean
  /** Rows per page (page controls appear only when there's more than one page) */
  pageSize?: number
}

export function DataTable<TData extends RowData>({
  columns,
  data,
  isLoading,
  pageSize = 10,
}: DataTableProps<TData>) {
  // Controlled so the footer re-renders on page change
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize })

  const table = useTable({
    features,
    data,
    columns,
    state: { pagination },
    onPaginationChange: (updater) =>
      setPagination(prev => (typeof updater === "function" ? updater(prev) : updater)),
  })

  const total = data.length
  const pageCount = Math.max(1, Math.ceil(total / pagination.pageSize))
  // Keep the page in range when rows are filtered/removed
  const pageIndex = Math.min(pagination.pageIndex, pageCount - 1)
  if (pageIndex !== pagination.pageIndex) setPagination(p => ({ ...p, pageIndex }))
  const from = total === 0 ? 0 : pageIndex * pagination.pageSize + 1
  const to = Math.min(total, (pageIndex + 1) * pagination.pageSize)

  return (
    <div>
    <div className="overflow-hidden rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                return (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : (
                      <table.FlexRender header={header} />
                    )}
                  </TableHead>
                )
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody className="bg-white">

          {
            isLoading && (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-28 text-center"
                >
                  <Spinner className="mx-auto size-4 lg:size-6"/>
                </TableCell>
              </TableRow>
            )
          }

          {!isLoading && table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && "selected"}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    <table.FlexRender cell={cell} />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            !isLoading && (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )
          )}
        </TableBody>
      </Table>
    </div>
      {!isLoading && pageCount > 1 && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>{from}–{to} of {total}</span>
          <div className="flex items-center gap-1">
            <Button type="button" variant="outline" size="sm" className="cursor-pointer bg-white"
              onClick={() => table.previousPage()} disabled={pageIndex === 0}>
              <ChevronLeftIcon /> Prev
            </Button>
            {Array.from({ length: pageCount }).map((_, i) => (
              <Button key={i} type="button" size="sm" variant={i === pageIndex ? "default" : "outline"}
                className={cn("min-w-8 cursor-pointer", i !== pageIndex && "bg-white")}
                onClick={() => table.setPageIndex(i)} aria-current={i === pageIndex ? "page" : undefined}>
                {i + 1}
              </Button>
            ))}
            <Button type="button" variant="outline" size="sm" className="cursor-pointer bg-white"
              onClick={() => table.nextPage()} disabled={pageIndex >= pageCount - 1}>
              Next <ChevronRightIcon />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}