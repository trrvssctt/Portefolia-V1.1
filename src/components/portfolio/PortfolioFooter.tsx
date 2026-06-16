import { ExternalLink } from "lucide-react";

export const PortfolioFooter = () => {
  return (
    <footer className="mt-16 border-t border-gray-100 py-8 px-4">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-sm text-gray-400">
          © {new Date().getFullYear()} — Portfolio propulsé par{' '}
          <a href="/" className="text-[#28A745] hover:underline font-semibold">Portefolia</a>
        </p>
        <a
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#28A745] text-white text-sm font-semibold hover:bg-green-600 transition-colors shadow-sm hover:shadow-md"
        >
          Créer mon portfolio
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </footer>
  );
};
