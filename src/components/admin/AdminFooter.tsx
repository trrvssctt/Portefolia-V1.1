const AdminFooter = () => {
  return (
    <footer className="bg-[#F9F9F9] border-t border-[#E8F5E9] mt-8">
      <div className="py-3 text-center text-xs text-gray-400">
        Portefolia Admin · © {new Date().getFullYear()}
      </div>
    </footer>
  );
};

export default AdminFooter;
