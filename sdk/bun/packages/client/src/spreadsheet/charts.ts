/** The pinned engine consumes the Chart.js UMD-style globals. Keep that vendor
 * contract here while loading the dependencies only with the spreadsheet. */
let loading: Promise<void> | undefined;
export function loadWorkbookCharts() {
  return loading ||= (async () => {
    const [chart, geo] = await Promise.all([import('chart.js'), import('chartjs-chart-geo')]);
    chart.Chart.register(...chart.registerables, geo.ChoroplethController, geo.BubbleMapController,
      geo.GeoFeature, geo.ColorScale, geo.ColorLogarithmicScale, geo.SizeScale, geo.SizeLogarithmicScale, geo.ProjectionScale);
    (window as any).Chart = Object.assign(chart.Chart, chart);
    (window as any).ChartGeo = geo;
    await import('chartjs-adapter-luxon');
  })();
}
