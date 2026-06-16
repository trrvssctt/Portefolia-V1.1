const AdminFooter = () => {
  return (
    <footer className="bg-white border-t mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col md:flex-row items-center justify-between text-sm text-gray-600 gap-3">
          <div>© {new Date().getFullYear()} CareerCard — Tous droits réservés</div>
          <div className="flex items-center space-x-4">
            <a className="hover:underline" href="#">Conditions</a>
            <a className="hover:underline" href="#">Confidentialité</a>
            <a className="hover:underline" href="#">Contact</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default AdminFooter;
