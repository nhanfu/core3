declare module 'virtual:core3-component-manifest' {
  const componentModules: Record<string, Record<string, any>>;
  const componentLoaders: Record<string, () => Promise<Record<string, any>>>;
  export { componentModules, componentLoaders };
  export default componentModules;
}
