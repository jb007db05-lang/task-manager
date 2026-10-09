import React, { useState, useEffect } from 'react';
import {
  Search,
  Clock,
  User,
  Monitor,
  Smartphone,
  Globe,
  ChevronDown,
  ChevronUp,
  Code
} from 'lucide-react';
import { getAnalyticsEvents, RawEvent } from '@/services/eventTracking';
import {
  useReactTable,
  getCoreRowModel,
  getExpandedRowModel,
  getPaginationRowModel,
  createColumnHelper,
  ExpandedState,
} from '@tanstack/react-table';
import DataTable from './DataTable';

const columnHelper = createColumnHelper<RawEvent>();

interface EventExplorerProps {
  selectedKeyId?: string;
}

const EventExplorer: React.FC<EventExplorerProps> = ({ selectedKeyId }) => {
  const [events, setEvents] = useState<RawEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const [searchTerm, setSearchTerm] = useState('');

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const data = await getAnalyticsEvents({
        apiKeyId: selectedKeyId,
        eventName: searchTerm || undefined,
        limit: 20
      });
      setEvents(data.events);
    } catch (err) {
      console.error('Failed to fetch events', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchEvents();
  }, [selectedKeyId, searchTerm]);

  const getDeviceIcon = (os: string = '') => {
    if (os.includes('Android') || os.includes('iOS')) return <Smartphone size={14} />;
    return <Monitor size={14} />;
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const columns = React.useMemo(() => [
    columnHelper.accessor('timestamp', {
      header: 'Timestamp',
      size: 180,
      cell: info => (
        <div className="flex items-center gap-2 text-[0.75rem] font-medium text-olive-500 ">
          <Clock size={12} className="text-olive-400" />
          {formatDate(info.getValue())}
        </div>
      ),
    }),
    columnHelper.accessor('eventName', {
      header: 'Event',
      size: 150,
      cell: info => {
        const name = info.getValue();
        return (
          <span className={`text-[0.7rem] px-2 py-0.5 rounded-md font-medium ${name.startsWith('page') ? 'bg-olive-500/10 text-olive-600' :
            name.startsWith('identify') ? 'bg-emerald-500/10 text-emerald-600' :
              'bg-olive-500/10 text-olive-700'
            }`}>
            {name.replace(/_/g, ' ')}
          </span>
        );
      },
    }),
    columnHelper.display({
      id: 'context',
      header: 'Context',
      size: 200,
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-olive-500 " title={row.original.context?.device?.os}>
            {getDeviceIcon(row.original.context?.device?.os)}
            <span className="text-[0.68rem] font-bold">{row.original.context?.device?.browser || 'SDK'}</span>
          </div>
          <div className="text-olive-300">|</div>
          <div className="flex items-center gap-1.5 text-olive-500 ">
            <User size={12} className="text-olive-400" />
            <span className="text-[0.68rem] font-bold max-w-[80px] truncate">{row.original.userId || 'anon'}</span>
          </div>
        </div>
      ),
    }),
    columnHelper.accessor('sessionId', {
      header: 'Session',
      size: 150,
      cell: info => (
        <code className="text-[0.63rem] font-mono text-olive-400 bg-olive-100  px-1.5 py-0.5 rounded">
          {info.getValue().substring(0, 8)}...
        </code>
      ),
    }),
    columnHelper.display({
      id: 'properties',
      header: () => <div className="text-right">Properties</div>,
      size: 100,
      cell: ({ row }) => (
        <div className="text-right">
          <div className="text-olive-300  group-hover:text-olive-500 transition-colors inline-block p-1">
            {row.getIsExpanded() ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </div>
      ),
    }),
  ], []);

  const table = useReactTable({
    data: events,
    columns,
    state: { expanded },
    onExpandedChange: setExpanded,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
    getRowCanExpand: () => true,
    getRowId: (row) => row._id,
  });

  const toggleRow = (event: RawEvent) => {
    const row = table.getRowModel().rows.find(r => r.original._id === event._id);
    if (!row) return;

    const isExpanding = !row.getIsExpanded();

    // Mutual exclusivity: Close all others if we are expanding
    if (isExpanding) {
      table.toggleAllRowsExpanded(false);
    }

    row.toggleExpanded();
  };

  return (
    <div className="bg-white  rounded-xl border border-olive-200/80  shadow-sm overflow-hidden flex flex-col h-full">
      <div className="p-6 border-b border-olive-100  flex flex-col md:flex-row md:items-center justify-between gap-4 bg-olive-50/30 ">
        <div>
          <span className="text-[0.68rem] font-bold text-olive-600">
            Observation Log
          </span>
          <h3 className="font-sans font-bold text-[1.1rem] text-olive-950  mt-1">Event Explorer</h3>
        </div>

        <div className="relative group flex-1 md:max-w-xs">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-olive-400 group-focus-within:text-olive-500 transition-colors">
            <Search size={16} />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 bg-white  border border-olive-200  rounded-lg text-sm font-medium focus:ring-2 focus:ring-olive-500/10 focus:border-olive-500 outline-none transition-all placeholder:text-olive-400"
            placeholder="Search event types..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <DataTable
        table={table}
        loading={loading && events.length === 0}
        onRowClick={toggleRow}
        renderExpandedRow={(event) => (
          <div className="px-8 py-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <p className="text-[0.63rem] font-bold text-olive-400 mb-3 flex items-center gap-2">
                  <Code size={12} />
                  Payload Properties
                </p>
                <div className="bg-olive-900 rounded-lg p-5 border border-olive-800 overflow-x-auto shadow-inner">
                  <pre className="text-[0.8rem] text-olive-200/90 font-mono leading-relaxed">
                    <code>{JSON.stringify(event.properties, null, 2)}</code>
                  </pre>
                </div>
              </div>
              <div>
                <p className="text-[0.63rem] font-bold text-olive-400 mb-3 flex items-center gap-2">
                  <Globe size={12} />
                  Environment Details
                </p>
                <div className="bg-white  rounded-lg p-5 border border-olive-200  font-medium space-y-3 shadow-sm">
                  <div className="flex justify-between border-b border-olive-100  pb-2">
                    <span className="text-[11px] text-olive-500">Library</span>
                    <span className="text-[0.75rem] font-bold text-olive-950 ">{event.context?.library?.name} v{event.context?.library?.version}</span>
                  </div>
                  <div className="flex justify-between border-b border-olive-100  pb-2">
                    <span className="text-[11px] text-olive-500">Screen</span>
                    <span className="text-[0.75rem] font-bold text-olive-950 ">{event.context?.device?.screen || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between border-b border-olive-100  pb-2">
                    <span className="text-[11px] text-olive-500">Language</span>
                    <span className="text-[0.75rem] font-bold text-olive-950 ">{event.context?.device?.language || 'N/A'}</span>
                  </div>
                  <div className="pt-2">
                    <span className="text-[11px] text-olive-500 block mb-1">Page URL</span>
                    <span className="text-[0.72rem] font-bold text-olive-600  break-all">{event.context?.page?.url || 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        skeletonRows={5}
        stickyHeader={true}
        className="flex-1 overflow-y-auto"
        emptyMessage="No events found"
      />
    </div>
  );
};

export default EventExplorer;
