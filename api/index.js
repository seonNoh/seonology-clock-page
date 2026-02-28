const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const util = require('util');

const execPromise = util.promisify(exec);

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration
app.use(cors());
app.use(express.json());

// Service icon mapping
const SERVICE_ICONS = {
  vault: {
    name: 'Vault',
    description: 'Secret Management',
    color: '#FFD814',
    icon: 'vault',
  },
  auth: {
    name: 'Keycloak',
    description: 'Authentication',
    color: '#4D9FFF',
    icon: 'key',
  },
  argocd: {
    name: 'Argo CD',
    description: 'GitOps CD',
    color: '#EF7B4D',
    icon: 'gitops',
  },
  cli: {
    name: 'seon CLI',
    description: 'CLI Tools',
    color: '#00D9FF',
    icon: 'terminal',
  },
  clock: {
    name: 'Clock',
    description: 'Dashboard',
    color: '#A78BFA',
    icon: 'clock',
  },
  grafana: {
    name: 'Grafana',
    description: 'Monitoring',
    color: '#F46800',
    icon: 'chart',
  },
};

// Get service key from hostname
function getServiceKey(hostname) {
  if (hostname.includes('vault')) return 'vault';
  if (hostname.includes('auth')) return 'auth';
  if (hostname.includes('argocd')) return 'argocd';
  if (hostname.includes('cli')) return 'cli';
  if (hostname.includes('clock')) return 'clock';
  if (hostname.includes('grafana')) return 'grafana';
  return null;
}

// API endpoint to get services
app.get('/api/services', async (req, res) => {
  try {
    console.log('=== Fetching services from k8s ===');
    
    const services = [];
    
    // Get standard Ingresses using kubectl
    try {
      console.log('Fetching standard Ingresses...');
      const { stdout: ingressJson } = await execPromise(
        'kubectl --context k3s-lightsail get ingress -A -o json'
      );
      const ingressData = JSON.parse(ingressJson);
      const ingresses = ingressData.items || [];
      console.log('Found', ingresses.length, 'standard ingresses');
      
      ingresses
        .filter((ingress) => {
          return ingress.spec.rules?.some((rule) =>
            rule.host?.includes('seonology.com')
          );
        })
        .forEach((ingress) => {
          const rule = ingress.spec.rules[0];
          const hostname = rule.host;
          console.log('Processing Ingress:', hostname);
          const serviceKey = getServiceKey(hostname);
          const serviceInfo = SERVICE_ICONS[serviceKey] || {
            name: hostname.split('.')[0],
            description: 'Service',
            color: '#888888',
            icon: 'default',
          };

          services.push({
            id: serviceKey || hostname,
            name: serviceInfo.name,
            url: `https://${hostname}`,
            description: serviceInfo.description,
            color: serviceInfo.color,
            icon: serviceInfo.icon,
          });
        });
    } catch (err) {
      console.error('Error fetching Ingresses:', err.message);
    }
    
    // Get Traefik IngressRoutes using kubectl
    try {
      console.log('Fetching IngressRoutes...');
      const { stdout: routeOutput } = await execPromise(
        'kubectl --context k3s-lightsail get ingressroute -A -o json'
      );
      const routeData = JSON.parse(routeOutput);
      const ingressRoutes = routeData.items || [];
      console.log('Found', ingressRoutes.length, 'ingressroutes');
      
      ingressRoutes.forEach((route) => {
        const routes = route.spec?.routes || [];
        routes.forEach((r) => {
          const match = r.match || '';
          const hostMatch = match.match(/Host\(`([^`]+)`\)/);
          if (hostMatch && hostMatch[1].includes('seonology.com')) {
            const hostname = hostMatch[1];
            console.log('Processing IngressRoute:', hostname);
            const serviceKey = getServiceKey(hostname);
            const serviceInfo = SERVICE_ICONS[serviceKey] || {
              name: hostname.split('.')[0],
              description: 'Service',
              color: '#888888',
              icon: 'default',
            };

            services.push({
              id: serviceKey || hostname,
              name: serviceInfo.name,
              url: `https://${hostname}`,
              description: serviceInfo.description,
              color: serviceInfo.color,
              icon: serviceInfo.icon,
            });
          }
        });
      });
    } catch (err) {
      console.error('Error fetching IngressRoutes:', err);
    }
    
    // Remove duplicates
    const uniqueServices = services.filter((service, index, self) =>
      index === self.findIndex((s) => s.id === service.id)
    );
    
    console.log('Total unique services:', uniqueServices.length);
    console.log('Services:', uniqueServices.map(s => s.name).join(', '));

    res.json({ services: uniqueServices });
  } catch (error) {
    console.error('Error fetching services:', error);
    res.status(500).json({ error: 'Failed to fetch services' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
});
