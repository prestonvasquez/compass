import { createStore } from 'redux';
import reducer from 'modules';
import rules from 'modules/rules';
import setup from 'modules/setup';

const store = createStore(reducer);
const metrics = require('mongodb-js-metrics')();

/**
 * Legacy tracking for Reflux store updates.
 *
 * @param {AppRegistry} appRegistry - The app registry.
 * @param {String} storeName - The store name.
 * @param {Object} rule - The rule.
 */
const trackStoreUpdate = (appRegistry, storeName, rule) => {
    const store = appRegistry.getStore(storeName);
    if (!store) {
      return;
    }
    // attach an event listener
    store.listen((state) => {
      // only track an event if the rule condition evaluates to true
      if (rule.condition(state)) {
        // Some stores trigger with arrays of data.
        if (rule.multi) {
          state.forEach((s) => {
            metrics.track(rule.resource, rule.action, rule.metadata(s));
          });
        } else {
          metrics.track(rule.resource, rule.action, rule.metadata(state));
        }
      }
    });
  }
};

/**
 * Tracking of events that are emitted on the app registry.
 *
 * @param {AppRegistry} appRegistry - The app registry.
 * @param {String} eventName - The name of the event.
 * @param {Object} rule - The rule.
 */
const trackRegistryEvent = (appRegistry, eventName, rule) => {
  // attach an event listener
  appRegistry.on(eventName, (...args) => {
    // only track an event if the rule condition evaluates to true
    if (rule.condition(...args)) {
      metrics.track(rule.resource, rule.action, rule.metadata(...args));
    }
  });
};

/**
 * When the app registry is activated setup the store.
 *
 * @param {AppRegistry} appRegistry - The app registry.
 */
store.onActivated = (appRegistry) => {
  appRegistry.on('application-initialized', (version, productName) => {
    setup(appRegistry, productName, version);

    // configure rules
    rules.forEach((rule) => {
      // get the store for this rule
      const storeName = rule.store;
      const eventName = rule.registryEvent;

      if (storeName) {
        trackStoreUpdate(appRegistry, storeName, rule);
      } else if (eventName) {
        trackRegistryEvent(appRegistry, eventName, rule);
      }
    });
  });
};

export default store;
export { trackStoreUpdate, trackRegistryEvent };
