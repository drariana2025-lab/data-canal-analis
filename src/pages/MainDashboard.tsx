import { useMemo, useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { useFilters } from '@/contexts/FilterContext';
import { useUserData } from '@/contexts/UserDataContext';
import { Download, Activity, TrendingUp, Calculator, ChevronDown, ChevronUp, Database, User, BarChart3, PieChart, LineChart as LineChartIcon, AreaChart as AreaChartIcon, ScatterChart as ScatterChartIcon, Radar, Gauge, Funnel } from 'lucide-react';
import { Button } from '@/components/ui/button';
import QRCodeGenerator from '@/components/QRCodeGenerator';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Footer } from '@/components/Footer';
import { toast } from 'sonner';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  Legend, ResponsiveContainer, ComposedChart, FunnelChart, Funnel, RadialBarChart, RadialBar,
  Treemap
} from 'recharts';

// Типы графиков
const CHART_TYPES = [
  { value: 'line', label: 'Линейный', icon: LineChartIcon },
  { value: 'bar', label: 'Столбчатый', icon: BarChart3 },
  { value: 'area', label: 'Область', icon: AreaChartIcon },
  { value: 'pie', label: 'Круговая', icon: PieChart },
  { value: 'radar', label: 'Радар', icon: Radar },
  { value: 'scatter', label: 'Точечная', icon: ScatterChartIcon },
  { value: 'composed', label: 'Комбинированный', icon: BarChart3 },
  { value: 'funnel', label: 'Воронка', icon: Funnel },
  { value: 'radial', label: 'Радиальная', icon: Gauge },
  { value: 'treemap', label: 'Дерево', icon: Database }
];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'];

export default function MainDashboard() {
  const { filteredData } = useFilters();
  const { analysisMetadata, activeFileName } = useUserData();
  const [showAllStats, setShowAllStats] = useState(false);
  const [selectedChartTypes, setSelectedChartTypes] = useState<Record<string, string>>({});

  const fmtNum = (v: number) => {
    if (typeof v !== 'number' || isNaN(v)) return '0';
    if (Math.abs(v) >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
    if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(0)}K`;
    if (Math.abs(v) % 1 !== 0) return v.toFixed(2);
    return String(v);
  };

  const columnStats = useMemo(() => {
    if (!filteredData.length || !analysisMetadata) return [];
    const numericCols = Object.entries(analysisMetadata.columns_info)
      .filter(([_, type]) => type === 'numeric')
      .map(([name]) => name);
    return numericCols.map(col => {
      const vals = filteredData.map(d => Number(d[col])).filter(v => !isNaN(v));
      const sum = vals.reduce((a, b) => a + b, 0);
      const avg = vals.length ? sum / vals.length : 0;
      const min = vals.length ? Math.min(...vals) : 0;
      const max = vals.length ? Math.max(...vals) : 0;
      return { name: col, sum: fmtNum(sum), avg: fmtNum(avg), min: fmtNum(min), max: fmtNum(max), count: vals.length };
    });
  }, [filteredData, analysisMetadata]);

  const displayedStats = showAllStats ? columnStats : columnStats.slice(0, 4);

  const handleDownloadPDF = useCallback(async () => {
    toast.info('Генерация PDF...');
    const { default: jsPDF } = await import('jspdf');
    await import('jspdf-autotable');
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(16);
    doc.text(`Отчёт по данным: ${activeFileName || 'Демо-данные'}`, 14, 15);
    doc.setFontSize(10);
    doc.text(`Дата: ${new Date().toLocaleDateString('ru-RU')}`, 14, 22);
    if (filteredData.length > 0) {
      const headers = Object.keys(filteredData[0]).slice(0, 8);
      const rows = filteredData.slice(0, 200).map(d => headers.map(h => String(d[h] || '')));
      (doc as any).autoTable({
        head: [headers], body: rows, startY: 28,
        styles: { fontSize: 7, cellPadding: 2 },
        headStyles: { fillColor: [59, 130, 246] },
      });
    }
    doc.save('report.pdf');
    toast.success('Отчёт скачан');
  }, [filteredData, activeFileName]);

  const getChart = (config: any, idx: number) => {
    const chartType = selectedChartTypes[config.id] || config.type || 'line';
    const data = filteredData;

    if (chartType === 'pie') {
      const aggregated = new Map<string, number>();
      filteredData.forEach(row => {
        const key = String(row[config.x]);
        const value = Number(row[config.y]) || 0;
        aggregated.set(key, (aggregated.get(key) || 0) + value);
      });
      const pieData = Array.from(aggregated.entries()).map(([name, value]) => ({ name, value })).slice(0, 8);
      return (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={pieData} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`} outerRadius={80} dataKey="value">
              {pieData.map((_, i) => <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <RechartsTooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      );
    }

    if (chartType === 'radial') {
      const values = filteredData.map(d => Number(d[config.y])).filter(v => !isNaN(v));
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      const radialData = [{ name: config.y, value: avg, fill: '#8884d8' }];
      return (
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart cx="50%" cy="50%" innerRadius="20%" outerRadius="80%" barSize={20} data={radialData} startAngle={180} endAngle={0}>
            <RadialBar minAngle={15} background clockWise dataKey="value" fill="#8884d8" label={{ position: 'insideStart', fill: '#fff' }} />
            <RechartsTooltip />
          </RadialBarChart>
        </ResponsiveContainer>
      );
    }

    if (chartType === 'radar') {
      const radarData = [{
        subject: config.y,
        value: filteredData.reduce((sum, d) => sum + (Number(d[config.y]) || 0), 0) / filteredData.length,
        fullMark: Math.max(...filteredData.map(d => Number(d[config.y]) || 0))
      }];
      return (
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
            <PolarGrid />
            <PolarAngleAxis dataKey="subject" />
            <PolarRadiusAxis angle={30} domain={[0, 'auto']} />
            <Radar name={config.y} dataKey="value" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
            <RechartsTooltip />
          </RadarChart>
        </ResponsiveContainer>
      );
    }

    if (chartType === 'funnel') {
      const funnelData = filteredData.slice(0, 8).map((d, i) => ({ name: String(d[config.x] || i + 1), value: Number(d[config.y]) || 0 }));
      return (
        <ResponsiveContainer width="100%" height="100%">
          <FunnelChart>
            <Funnel dataKey="value" data={funnelData} isAnimationActive labelLine label={({ name, value }) => `${name}: ${value}`}>
              {funnelData.map((_, i) => <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />)}
            </Funnel>
            <RechartsTooltip />
          </FunnelChart>
        </ResponsiveContainer>
      );
    }

    if (chartType === 'treemap') {
      const treeData = filteredData.slice(0, 20).map((d, i) => ({ name: String(d[config.x] || i), size: Number(d[config.y]) || 1 }));
      return (
        <ResponsiveContainer width="100%" height="100%">
          <Treemap data={treeData} dataKey="size" ratio={4 / 3} stroke="#fff" fill="#8884d8" />
        </ResponsiveContainer>
      );
    }

    if (chartType === 'composed') {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={config.x} />
            <YAxis />
            <RechartsTooltip />
            <Legend />
            <Bar dataKey={config.y} barSize={20} fill="#8884d8" />
            <Line type="monotone" dataKey={config.y} stroke="#ff7300" strokeWidth={2} />
          </ComposedChart>
        </ResponsiveContainer>
      );
    }

    return (
      <ResponsiveContainer width="100%" height="100%">
        {chartType === 'line' && (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted)/0.2)" />
            <XAxis dataKey={config.x} fontSize={10} axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
            <YAxis fontSize={10} axisLine={false} tickLine={false} tickFormatter={fmtNum} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
            <RechartsTooltip contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)', backgroundColor: 'hsl(var(--card))' }} />
            <Line type="monotone" dataKey={config.y} stroke="hsl(var(--primary))" strokeWidth={5} dot={{ r: 4, fill: 'hsl(var(--primary))', strokeWidth: 0 }} activeDot={{ r: 8, stroke: 'white', strokeWidth: 4 }} />
          </LineChart>
        )}
        {chartType === 'bar' && (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted)/0.2)" />
            <XAxis dataKey={config.x} fontSize={10} axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
            <YAxis fontSize={10} axisLine={false} tickLine={false} tickFormatter={fmtNum} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
            <RechartsTooltip contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)', backgroundColor: 'hsl(var(--card))' }} />
            <Bar dataKey={config.y} fill="hsl(var(--primary))" radius={[12, 12, 0, 0]} />
          </BarChart>
        )}
        {chartType === 'area' && (
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted)/0.2)" />
            <XAxis dataKey={config.x} fontSize={10} axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
            <YAxis fontSize={10} axisLine={false} tickLine={false} tickFormatter={fmtNum} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
            <RechartsTooltip contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)', backgroundColor: 'hsl(var(--card))' }} />
            <Area type="monotone" dataKey={config.y} stroke="hsl(var(--primary))" fill="hsl(var(--primary)/0.3)" strokeWidth={3} />
          </AreaChart>
        )}
        {chartType === 'scatter' && (
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={config.x} name={config.x} />
            <YAxis dataKey={config.y} name={config.y} />
            <RechartsTooltip cursor={{ strokeDasharray: '3 3' }} />
            <Scatter name="Корреляция" data={data} fill="hsl(var(--primary))" />
          </ScatterChart>
        )}
      </ResponsiveContainer>
    );
  };

  if (!activeFileName) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-6 text-center px-3">
        <div className="relative group">
          <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full scale-150 group-hover:bg-primary/30 transition-all duration-700" />
          <div className="relative p-8 rounded-full bg-primary/10 transition-all hover:scale-110 duration-500">
            <Activity className="h-20 w-20 text-primary animate-pulse" />
          </div>
        </div>
        <div>
          <h2 className="text-3xl font-black tracking-tight text-foreground">Ваш анализатор данных</h2>
          <p className="text-muted-foreground max-w-sm mx-auto mt-3 font-medium">Никаких шаблонов. Сайт мгновенно подстроится под любую структуру данных из вашего файла.</p>
        </div>
        <Button onClick={() => window.location.href = '/profile'} className="h-12 w-full max-w-sm px-6 rounded-full shadow-2xl shadow-primary/40 hover:scale-105 transition-transform font-bold text-base">
          Начать анализ
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in pb-20 w-full max-w-full min-w-0 overflow-x-hidden">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between min-w-0">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-1">
            <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-none px-2 sm:px-3 font-bold uppercase tracking-widest text-[8px] sm:text-[9px]">Данные в реальном времени</Badge>
            <span className="text-xs text-muted-foreground font-mono whitespace-nowrap">{new Date().toLocaleTimeString()}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tighter bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent break-words">
            {activeFileName || 'Анализ данных'}
          </h1>
          {analysisMetadata && (
            <p className="text-xs font-semibold text-muted-foreground/60 flex items-center gap-1.5 mt-2 uppercase tracking-wide">
              <Database className="h-3 w-3" /> {analysisMetadata.row_count} строк · {Object.keys(analysisMetadata.columns_info).length} факторов обнаружено
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-3 w-full md:w-auto md:shrink-0">
          <QRCodeGenerator />
          <Button variant="outline" size="lg" onClick={handleDownloadPDF} className="rounded-2xl border-none shadow-xl bg-card hover:bg-primary/5 group">
            <Download className="h-5 w-5 mr-1.5 shrink-0 group-hover:translate-y-0.5 transition-transform" />Экспорт
          </Button>
        </div>
      </div>

      <section className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-1">
          <h3 className="text-xs sm:text-sm font-black uppercase tracking-widest text-muted-foreground/80 flex items-center gap-2">
            <Calculator className="h-4 w-4 text-primary shrink-0" /> Статистика характеристик
          </h3>
          {columnStats.length > 4 && (
            <Button variant="ghost" size="sm" onClick={() => setShowAllStats(!showAllStats)} className="text-[10px] font-bold uppercase">
              {showAllStats ? 'Свернуть' : 'Все характеристики'} {showAllStats ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
            </Button>
          )}
        </div>
        {columnStats.length === 0 ? (
          <div className="p-8 text-center bg-muted/20 border-2 border-dashed rounded-3xl text-sm font-medium text-muted-foreground">
            Числовые колонки для расчета статистики не найдены.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {displayedStats.map((stat, idx) => (
              <Card key={idx} className="border-none shadow-2xl bg-card/60 backdrop-blur-md group hover:bg-primary/[0.02] transition-colors duration-500 rounded-3xl overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="p-2 w-fit rounded-xl bg-primary/5 group-hover:bg-primary/10 transition-colors mb-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                  </div>
                  <CardTitle className="text-sm font-black truncate text-foreground/90 uppercase tracking-tight">{stat.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-black mb-4 group-hover:scale-105 origin-left transition-transform">{stat.sum}</div>
                  <div className="grid grid-cols-3 gap-2 border-t pt-4 border-foreground/5">
                    <div className="text-center"><p className="text-[9px] font-black text-muted-foreground uppercase">Среднее</p><p className="text-xs font-bold text-primary">{stat.avg}</p></div>
                    <div className="text-center"><p className="text-[9px] font-black text-muted-foreground uppercase">Мин</p><p className="text-xs font-bold">{stat.min}</p></div>
                    <div className="text-center"><p className="text-[9px] font-black text-muted-foreground uppercase">Макс</p><p className="text-xs font-bold">{stat.max}</p></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
        {analysisMetadata?.chart_configs.slice(0, 6).map((config, idx) => {
          const currentType = selectedChartTypes[config.id] || config.type || 'line';
          const chartTypeInfo = CHART_TYPES.find(t => t.value === currentType) || CHART_TYPES[0];
          const Icon = chartTypeInfo.icon;
          return (
            <Card key={idx} className="border-none shadow-2xl bg-card/40 backdrop-blur-xl rounded-[24px] sm:rounded-[32px] overflow-hidden">
              <CardHeader className="pb-0 pt-4 px-4 sm:pt-8 sm:px-8">
                <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-primary animate-pulse shrink-0" />
                    <CardDescription className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">
                      <Icon className="h-3 w-3" /> {chartTypeInfo.label}
                    </CardDescription>
                  </div>
                  <select value={currentType} onChange={(e) => setSelectedChartTypes({ ...selectedChartTypes, [config.id]: e.target.value })} className="text-xs bg-background border border-border rounded-lg px-2 py-1">
                    {CHART_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <CardTitle className="text-lg sm:text-2xl font-black tracking-tighter break-words">
                  {config.title || `Зависимость ${config.y} от ${config.x}`}
                </CardTitle>
                <div className="flex gap-2 mt-1">
                  <Badge variant="outline" className="text-[9px]">X: {config.x}</Badge>
                  <Badge variant="outline" className="text-[9px]">Y: {config.y}</Badge>
                </div>
              </CardHeader>
              <CardContent className="h-[280px] sm:h-[340px] lg:h-[400px] p-3 sm:p-4 lg:p-8">
                {getChart(config, idx)}
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="pt-6 sm:pt-10 border-t border-border/40">
        <Card className="border-none shadow-xl bg-card/60 backdrop-blur-sm rounded-[24px] sm:rounded-[32px] overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl font-black tracking-tight">
              <User className="h-5 w-5 text-primary" /> Личный кабинет
            </CardTitle>
            <CardDescription className="font-medium">Загрузка файлов, запуск анализа и библиотека данных</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="rounded-xl font-bold"><Link to="/profile">Открыть личный кабинет</Link></Button>
          </CardContent>
        </Card>
      </section>

      <Footer />
    </div>
  );
}
