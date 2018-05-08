import Simpla from 'simpla';
import SimplaNetlify from 'simpla/adapters/netlify';

const SIMPLA_CONFIG = {
  repo: 'simplajs/simplajs.org',
  auth: new SimplaNetlify({ site: 'simplajs' }),
  source: window.location.origin,
  branch: 'master'
};

// Config Polymer
window.Polymer = {
  dom: 'shadow',
  lazyRegister: true,
  useNativeCSSProperties: true
};

// Init Simpla
Simpla.init(SIMPLA_CONFIG);
window.Simpla = Simpla;

// Save utility method
// We're not using simpla-admin due to demo mode
window.SimplaJS = {};
window.SimplaJS.save = () => {
  const loginThenSave = () => {
    if (!Simpla.getState('authenticated')) {
      return Simpla.login().then(() => Simpla.save());
    }

    return Simpla.save();
  };

  loginThenSave()
    .then(() => alert('Content saved!'))
    .catch(err => alert(`Save failed, ${err}`));
};
