import { createStore, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';
import { dataServiceConnected } from '../modules/data-service';
import reducer, { open } from '../modules/drop-database';

const store = createStore(reducer, applyMiddleware(thunk));

store.onActivated = (appRegistry) => {
  /**
   * Set the data service in the store when connected.
   *
   * @param {Error} error - The error.
   * @param {DataService} dataService - The data service.
   */
  appRegistry.on('data-service-connected', (error, dataService) => {
    store.dispatch(dataServiceConnected(error, dataService));
  });

  /**
   * When needing to drop a database from elsewhere, the app registry
   * event is emitted.
   *
   * @param {String} name - The database name.
   */
  appRegistry.on('open-drop-database', (name) => {
    store.dispatch(open(name));
  });
};

export default store;
