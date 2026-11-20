import backend from '../functions/lib/backend.js';

export default {fetch:backend.createBackend({allowSameOrigin:true})};
