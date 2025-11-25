/**
 * Translation Utility for Agent Data
 * 
 * Translates agent location (city) in agent responses
 */

/**
 * Translate an agent object
 * @param {Object} agent - Agent object from database
 * @param {Function} t - Translation function from req.t
 * @returns {Object} Translated agent object
 */
function translateAgent(agent, t) {
  if (!agent || !t) return agent;

  const translated = { ...agent };

  // Translate location (city)
  if (translated.location) {
    const cityKey = `cities.${translated.location}`;
    const translatedCity = t(cityKey);
    // Only use translation if it exists (not the key itself)
    if (translatedCity && translatedCity !== cityKey) {
      translated.location = translatedCity;
      translated.locationOriginal = agent.location; // Keep original for filtering
    }
  }

  // Translate officeAddress if it's a city name
  if (translated.officeAddress) {
    const cityKey = `cities.${translated.officeAddress}`;
    const translatedCity = t(cityKey);
    if (translatedCity && translatedCity !== cityKey) {
      translated.officeAddress = translatedCity;
      translated.officeAddressOriginal = agent.officeAddress;
    }
  }

  return translated;
}

/**
 * Translate an array of agents
 * @param {Array} agents - Array of agent objects
 * @param {Function} t - Translation function from req.t
 * @returns {Array} Array of translated agent objects
 */
function translateAgents(agents, t) {
  if (!Array.isArray(agents) || !t) return agents;
  return agents.map(agent => translateAgent(agent, t));
}

module.exports = {
  translateAgent,
  translateAgents,
};



