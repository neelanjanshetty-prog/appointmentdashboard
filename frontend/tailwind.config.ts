import type { Config } from "tailwindcss";

const classSeed = `
  min-h-screen h-screen w-full max-w-7xl max-w-md max-w-lg min-w-0 min-w-64 w-72 w-14 w-12 w-11 w-10 w-9 h-14 h-12 h-11 h-10 h-9 h-6 h-5 h-4
  min-h-28 max-h-[90vh] max-w-2xl max-w-4xl max-w-full min-w-[760px] h-64 h-72
  fixed sticky inset-0 top-0 right-4 top-4 z-20 z-50 z-[60] mx-auto mt-1 mt-2 mt-3 mt-4 mt-5 mt-6 mt-7 mt-8 mb-4 mb-6 mb-0 ml-2 p-3 p-4 p-5 p-6 p-8 px-0 px-2 px-2.5 px-3 px-4 px-6 py-1 py-2 py-2.5 py-3 py-4 py-10
  grid flex hidden block inline-flex table w-full place-items-center items-center items-end align-middle justify-center justify-between justify-end gap-1 gap-2 gap-3 gap-4 gap-5 gap-6 shrink-0 flex-1 flex-col flex-wrap border-collapse overflow-hidden overflow-y-auto overflow-x-auto divide-y
  rounded-full rounded-xl rounded-2xl border border-b border-t border-white/60 border-white/10 border-slate-200 border-slate-200/70 border-blue-200 border-blue-400/20
  bg-transparent bg-white bg-white/45 bg-white/60 bg-white/70 bg-white/80 bg-white/10 bg-white/5 bg-slate-50 bg-slate-50/80 bg-slate-100 bg-slate-200/80 bg-slate-950/50 bg-slate-950/60 bg-blue-50 bg-blue-400/10 bg-blue-600 bg-blue-700 bg-emerald-50 bg-emerald-500 bg-yellow-50 bg-purple-50 bg-rose-50 bg-rose-500 bg-rose-600 bg-rose-700 bg-rose-500/10
  text-left text-center text-right text-xs text-sm text-base text-lg text-xl text-2xl font-medium font-semibold font-bold uppercase tracking-[0.2em]
  text-white text-slate-950 text-slate-900 text-slate-800 text-slate-700 text-slate-600 text-slate-500 text-slate-400 text-blue-600 text-blue-700 text-blue-800 text-blue-900 text-blue-300 text-blue-200 text-emerald-500 text-emerald-700 text-yellow-700 text-yellow-800 text-purple-700 text-rose-200 text-rose-300 text-rose-600 text-rose-700
  shadow-lg shadow-soft shadow-blue-600/20 shadow-blue-600/25 backdrop-blur-sm backdrop-blur-xl outline-none transition hover:bg-blue-700 hover:bg-slate-50 hover:bg-slate-100 hover:bg-white/70 hover:text-slate-950
  focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-60 animate-spin animate-pulse cursor-not-allowed opacity-60
  md:flex md:grid-cols-2 md:grid-cols-[1fr_160px_44px] md:grid-cols-[1fr_240px] lg:block lg:hidden lg:p-8 xl:grid-cols-2 xl:grid-cols-3 xl:grid-cols-4 xl:col-span-1 sm:flex-row sm:items-center sm:items-end sm:justify-between sm:px-6 sm:p-6 sm:text-2xl sm:inline
  dark:bg-slate-950/60 dark:bg-white/10 dark:bg-white/5 dark:bg-blue-400/10 dark:bg-emerald-400/10 dark:bg-yellow-400/10 dark:bg-purple-400/10 dark:bg-rose-500/10 dark:border-white/10 dark:border-blue-400/20 dark:text-white dark:text-slate-400 dark:text-slate-300 dark:text-slate-200 dark:text-blue-300 dark:text-blue-200 dark:text-emerald-200 dark:text-yellow-200 dark:text-purple-200 dark:text-rose-200 dark:text-rose-300 dark:divide-white/10 dark:hover:bg-white/10 dark:hover:bg-white/5 dark:hover:text-white
`;

const config: Config = {
  darkMode: "class",
  content: [
    {
      raw: classSeed,
      extension: "tsx"
    }
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eff6ff",
          100: "#dbeafe",
          500: "#2563eb",
          600: "#1d4ed8",
          700: "#1e40af"
        }
      },
      boxShadow: {
        soft: "0 24px 80px rgba(15, 23, 42, 0.12)"
      }
    }
  },
  plugins: []
};

export default config;
