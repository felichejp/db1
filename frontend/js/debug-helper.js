// Helper para cargar APIs dinámicamente en la consola
// Usar: await loadAPIs(); window.groupsAPI.getAll();

export async function loadAPIs() {
  try {
    // Importar dinámicamente
    const { groupsAPI } = await import('./api/groups.js');
    const { messagesAPI } = await import('./api/messages.js');
    
    // Exponer globalmente
    window.groupsAPI = groupsAPI;
    window.messagesAPI = messagesAPI;
    
    console.log('✅ APIs cargadas:');
    console.log('   - window.groupsAPI');
    console.log('   - window.messagesAPI');
    
    return { groupsAPI, messagesAPI };
  } catch (error) {
    console.error('❌ Error cargando APIs:', error);
    throw error;
  }
}

// Auto-exponer si estamos en desarrollo
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  window.loadAPIs = loadAPIs;
}

