import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';

const AdminNav = ({ profile, onSignOut }: { profile?: any; onSignOut?: () => void }) => {
  const navigate = useNavigate();
  let auth;
  try {
    auth = useAuth();
  } catch (e) {
    auth = null;
  }
  return (
    <header className="bg-white border-b shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate('/admin')}>
              <div className="h-9 w-9 bg-[#28A745] rounded-md flex items-center justify-center text-white font-bold">CC</div>
              <div className="text-lg font-semibold text-gray-900">CareerCard Admin</div>
            </div>

            <nav className="hidden lg:flex items-center space-x-4 text-sm">
              <NavLink to="/admin" className={({isActive}) => `px-3 py-2 rounded-md ${isActive ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}>Overview</NavLink>
              <NavLink to="/admin/users" className={({isActive}) => `px-3 py-2 rounded-md ${isActive ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}>Utilisateurs</NavLink>
              <NavLink to="/admin/portfolios" className={({isActive}) => `px-3 py-2 rounded-md ${isActive ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}>Portfolios</NavLink>
              <NavLink to="/admin/plans" className={({isActive}) => `px-3 py-2 rounded-md ${isActive ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}>Formules</NavLink>
              <NavLink to="/admin/upgrades" className={({isActive}) => `px-3 py-2 rounded-md ${isActive ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}>Demandes d'upgrade</NavLink>
              <NavLink to="/admin/commandes" className={({isActive}) => `px-3 py-2 rounded-md ${isActive ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}>Commandes</NavLink>
              <NavLink to="/admin/cartes" className={({isActive}) => `px-3 py-2 rounded-md ${isActive ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}>Cartes</NavLink>
              <NavLink to="/admin/paiements" className={({isActive}) => `px-3 py-2 rounded-md ${isActive ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}>Paiements</NavLink>
              <NavLink to="/admin/notifications" className={({isActive}) => `px-3 py-2 rounded-md ${isActive ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}>Notifications</NavLink>
              <NavLink to="/admin/stats" className={({isActive}) => `px-3 py-2 rounded-md ${isActive ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}>Stats</NavLink>
            </nav>
          </div>

          <div className="flex items-center space-x-4">
            {profile && (
              <div className="flex items-center space-x-3">
                <Avatar>
                  {profile.photo_profil ? (
                    <img
                      src={profile.photo_profil}
                      alt={profile?.first_name || 'Admin'}
                      className="h-9 w-9 rounded-full object-cover"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                    />
                  ) : (
                    <div className="h-9 w-9 rounded-full bg-gray-200 flex items-center justify-center text-sm text-gray-700">{(profile?.first_name || profile?.nom || 'A').charAt(0)}</div>
                  )}
                </Avatar>
                <div className="text-sm text-gray-700">{profile?.first_name || profile?.nom || 'Admin'}</div>
              </div>
            )}
            <div className="hidden sm:block">
              <Button
                variant="outline"
                onClick={async () => {
                  try {
                    if (onSignOut) {
                      onSignOut();
                    } else if (auth && auth.signOut) {
                      await auth.signOut();
                    }
                  } catch (err) {
                    // ignore
                  } finally {
                    navigate('/auth');
                  }
                }}
              >
                Se déconnecter
              </Button>
            </div>
            <div className="sm:hidden">
              <Button variant="ghost" onClick={() => navigate('/admin')}>Menu</Button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default AdminNav;
