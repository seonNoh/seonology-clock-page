const express = require('express');
const cors = require('cors');
const https = require('https');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration
app.use(cors());
app.use(express.json());

// Kubernetes API configuration
const K8S_API_HOST = process.env.KUBERNETES_SERVICE_HOST || 'kubernetes.default.svc';
const K8S_API_PORT = process.env.KUBERNETES_SERVICE_PORT || '443';
const K8S_TOKEN_PATH = '/var/run/secrets/kubernetes.io/serviceaccount/token';
const K8S_CA_PATH = '/var/run/secrets/kubernetes.io/serviceaccount/ca.crt';

// Check if running in k8s
const isInCluster = fs.existsSync(K8S_TOKEN_PATH);

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

// Kubernetes API request helper
function k8sRequest(path) {
  return new Promise((resolve, reject) => {
    if (!isInCluster) {
      reject(new Error('Not running in Kubernetes cluster'));
      return;
    }

    const token = fs.readFileSync(K8S_TOKEN_PATH, 'utf8');
    const ca = fs.readFileSync(K8S_CA_PATH);

    const options = {
      hostname: K8S_API_HOST,
      port: K8S_API_PORT,
      path: path,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      ca: ca,
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (err) {
          reject(err);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

// Fallback to kubectl for local development
async function fetchWithKubectl() {
  const { exec } = require('child_process');
  const util = require('util');
  const execPromise = util.promisify(exec);

  const services = [];

  try {
    const { stdout: ingressJson } = await execPromise(
      'kubectl --context k3s-lightsail get ingress -A -o json'
    );
    const ingressData = JSON.parse(ingressJson);
    const ingresses = ingressData.items || [];

    ingresses
      .filter((ingress) => {
        return ingress.spec.rules?.some((rule) =>
          rule.host?.includes('seonology.com')
        );
      })
      .forEach((ingress) => {
        const rule = ingress.spec.rules[0];
        const hostname = rule.host;
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

  try {
    const { stdout: routeOutput } = await execPromise(
      'kubectl --context k3s-lightsail get ingressroute -A -o json'
    );
    const routeData = JSON.parse(routeOutput);
    const ingressRoutes = routeData.items || [];

    ingressRoutes.forEach((route) => {
      const routes = route.spec?.routes || [];
      routes.forEach((r) => {
        const match = r.match || '';
        const hostMatch = match.match(/Host\(`([^`]+)`\)/);
        if (hostMatch && hostMatch[1].includes('seonology.com')) {
          const hostname = hostMatch[1];
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

  return services;
}

// API endpoint to get services
app.get('/api/services', async (req, res) => {
  try {
    console.log('=== Fetching services from k8s ===');
    console.log('Running in cluster:', isInCluster);

    let services = [];

    if (isInCluster) {
      // Fetch from k8s API
      try {
        const ingressData = await k8sRequest('/apis/networking.k8s.io/v1/ingresses');
        const ingresses = ingressData.items || [];

        ingresses
          .filter((ingress) => {
            return ingress.spec.rules?.some((rule) =>
              rule.host?.includes('seonology.com')
            );
          })
          .forEach((ingress) => {
            const rule = ingress.spec.rules[0];
            const hostname = rule.host;
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
        console.error('Error fetching Ingresses from k8s API:', err.message);
      }

      try {
        const routeData = await k8sRequest('/apis/traefik.io/v1alpha1/ingressroutes');
        const ingressRoutes = routeData.items || [];

        ingressRoutes.forEach((route) => {
          const routes = route.spec?.routes || [];
          routes.forEach((r) => {
            const match = r.match || '';
            const hostMatch = match.match(/Host\(`([^`]+)`\)/);
            if (hostMatch && hostMatch[1].includes('seonology.com')) {
              const hostname = hostMatch[1];
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
        console.error('Error fetching IngressRoutes from k8s API:', err.message);
      }
    } else {
      // Fallback to kubectl for local development
      services = await fetchWithKubectl();
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
  console.log(`Running in cluster: ${isInCluster}`);
});
