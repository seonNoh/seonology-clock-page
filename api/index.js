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
  vault: { name: 'Vault', description: 'Secret Management', color: '#FFD814', icon: 'vault' },
  auth: { name: 'Keycloak', description: 'Authentication', color: '#4D9FFF', icon: 'key' },
  argocd: { name: 'Argo CD', description: 'GitOps CD', color: '#EF7B4D', icon: 'gitops' },
  cli: { name: 'seon CLI', description: 'CLI Tools', color: '#00D9FF', icon: 'terminal' },
  clock: { name: 'Clock', description: 'Dashboard', color: '#A78BFA', icon: 'clock' },
  grafana: { name: 'Grafana', description: 'Monitoring', color: '#F46800', icon: 'chart' },
  aw: { name: 'ActivityWatch', description: 'Time Tracking', color: '#4CAF50', icon: 'activity' },
  'aw-api': { name: 'ActivityWatch API', description: 'Time Tracking API', color: '#4CAF50', icon: 'activity' },
  backstage: { name: 'Backstage', description: 'Developer Portal', color: '#9D4EDD', icon: 'portal' },
  blinko: { name: 'Blinko', description: 'Notes', color: '#FFB703', icon: 'note' },
  chat: { name: 'Mattermost', description: 'Team Chat', color: '#0072C6', icon: 'chat' },
  cms: { name: 'CMS', description: 'Content Management', color: '#06B6D4', icon: 'content' },
  code: { name: 'Coder', description: 'Dev Environment', color: '#6366F1', icon: 'code' },
  comic: { name: 'Komga', description: 'Comics', color: '#EC4899', icon: 'book' },
  file: { name: 'FileBrowser', description: 'File Manager', color: '#10B981', icon: 'folder' },
  headlamp: { name: 'Headlamp', description: 'K8s UI', color: '#3B82F6', icon: 'k8s' },
  journey: { name: 'Journey', description: 'Travel Planner', color: '#8B5CF6', icon: 'map' },
  k8s: { name: 'K8s Roadmap', description: 'Learning Path', color: '#326CE5', icon: 'k8s' },
  longhorn: { name: 'Longhorn', description: 'Storage', color: '#F97316', icon: 'storage' },
  music: { name: 'Navidrome', description: 'Music Server', color: '#EF4444', icon: 'music' },
  my: { name: 'Portal', description: 'User Portal', color: '#14B8A6', icon: 'user' },
  pdf: { name: 'Stirling PDF', description: 'PDF Tools', color: '#DC2626', icon: 'pdf' },
  photos: { name: 'Immich', description: 'Photo Library', color: '#F59E0B', icon: 'photo' },
  share: { name: 'Content Share', description: 'File Sharing', color: '#22C55E', icon: 'share' },
  tasks: { name: 'Vikunja', description: 'Task Manager', color: '#A855F7', icon: 'task' },
  webdav: { name: 'WebDAV', description: 'File Sync', color: '#0EA5E9', icon: 'cloud' },
  wiki: { name: 'Outline', description: 'Wiki', color: '#6366F1', icon: 'wiki' },
  workflow: { name: 'n8n', description: 'Automation', color: '#EA580C', icon: 'workflow' },
  www: { name: 'Homarr', description: 'Homepage', color: '#7C3AED', icon: 'home' },
};

// Get service key from hostname
function getServiceKey(hostname) {
  if (hostname.includes('vault')) return 'vault';
  if (hostname.includes('auth')) return 'auth';
  if (hostname.includes('argocd')) return 'argocd';
  if (hostname.includes('cli')) return 'cli';
  if (hostname.includes('clock')) return 'clock';
  if (hostname.includes('grafana')) return 'grafana';
  if (hostname.includes('aw-api')) return 'aw-api';
  if (hostname.includes('aw.')) return 'aw';
  if (hostname.includes('backstage')) return 'backstage';
  if (hostname.includes('blinko')) return 'blinko';
  if (hostname.includes('chat')) return 'chat';
  if (hostname.includes('cms')) return 'cms';
  if (hostname.includes('code')) return 'code';
  if (hostname.includes('comic')) return 'comic';
  if (hostname.includes('file')) return 'file';
  if (hostname.includes('headlamp')) return 'headlamp';
  if (hostname.includes('journey')) return 'journey';
  if (hostname.includes('k8s')) return 'k8s';
  if (hostname.includes('longhorn')) return 'longhorn';
  if (hostname.includes('music')) return 'music';
  if (hostname.includes('my.')) return 'my';
  if (hostname.includes('pdf')) return 'pdf';
  if (hostname.includes('photos')) return 'photos';
  if (hostname.includes('share')) return 'share';
  if (hostname.includes('tasks')) return 'tasks';
  if (hostname.includes('webdav')) return 'webdav';
  if (hostname.includes('wiki')) return 'wiki';
  if (hostname.includes('workflow')) return 'workflow';
  if (hostname.includes('www')) return 'www';
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

// ===== BOOKMARKS API =====
const path = require('path');
const BOOKMARKS_DIR = process.env.BOOKMARKS_DIR || path.join(__dirname, '..', 'data');
const BOOKMARKS_FILE = path.join(BOOKMARKS_DIR, 'bookmarks.json');

// Default bookmarks structure
const DEFAULT_BOOKMARKS = {
  categories: [
    {
      id: 'default',
      name: 'Bookmarks',
      order: 0,
      bookmarks: [],
    },
  ],
};

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function readBookmarks() {
  try {
    ensureDir(BOOKMARKS_DIR);
    if (!fs.existsSync(BOOKMARKS_FILE)) {
      fs.writeFileSync(BOOKMARKS_FILE, JSON.stringify(DEFAULT_BOOKMARKS, null, 2));
      return DEFAULT_BOOKMARKS;
    }
    return JSON.parse(fs.readFileSync(BOOKMARKS_FILE, 'utf8'));
  } catch (err) {
    console.error('Error reading bookmarks:', err);
    return DEFAULT_BOOKMARKS;
  }
}

function writeBookmarks(data) {
  ensureDir(BOOKMARKS_DIR);
  fs.writeFileSync(BOOKMARKS_FILE, JSON.stringify(data, null, 2));
}

// GET all bookmarks
app.get('/api/bookmarks', (req, res) => {
  try {
    const data = readBookmarks();
    res.json(data);
  } catch (err) {
    console.error('Error getting bookmarks:', err);
    res.status(500).json({ error: 'Failed to read bookmarks' });
  }
});

// PUT replace all bookmarks (full save)
app.put('/api/bookmarks', (req, res) => {
  try {
    const data = req.body;
    if (!data || !Array.isArray(data.categories)) {
      return res.status(400).json({ error: 'Invalid bookmarks data' });
    }
    writeBookmarks(data);
    res.json({ success: true });
  } catch (err) {
    console.error('Error saving bookmarks:', err);
    res.status(500).json({ error: 'Failed to save bookmarks' });
  }
});

// POST add a category
app.post('/api/bookmarks/categories', (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Category name is required' });
    const data = readBookmarks();
    const id = `cat-${Date.now()}`;
    const order = data.categories.length;
    data.categories.push({ id, name, order, bookmarks: [] });
    writeBookmarks(data);
    res.json({ success: true, category: { id, name, order, bookmarks: [] } });
  } catch (err) {
    console.error('Error adding category:', err);
    res.status(500).json({ error: 'Failed to add category' });
  }
});

// DELETE a category
app.delete('/api/bookmarks/categories/:categoryId', (req, res) => {
  try {
    const data = readBookmarks();
    data.categories = data.categories.filter(c => c.id !== req.params.categoryId);
    writeBookmarks(data);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting category:', err);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

// POST add a bookmark to a category
app.post('/api/bookmarks/categories/:categoryId/bookmarks', (req, res) => {
  try {
    const { name, url, icon, color } = req.body;
    if (!name || !url) return res.status(400).json({ error: 'Name and URL are required' });
    const data = readBookmarks();
    const cat = data.categories.find(c => c.id === req.params.categoryId);
    if (!cat) return res.status(404).json({ error: 'Category not found' });
    const bookmark = { id: `bm-${Date.now()}`, name, url, icon: icon || 'default', color: color || '#6366f1' };
    cat.bookmarks.push(bookmark);
    writeBookmarks(data);
    res.json({ success: true, bookmark });
  } catch (err) {
    console.error('Error adding bookmark:', err);
    res.status(500).json({ error: 'Failed to add bookmark' });
  }
});

// DELETE a bookmark
app.delete('/api/bookmarks/categories/:categoryId/bookmarks/:bookmarkId', (req, res) => {
  try {
    const data = readBookmarks();
    const cat = data.categories.find(c => c.id === req.params.categoryId);
    if (!cat) return res.status(404).json({ error: 'Category not found' });
    cat.bookmarks = cat.bookmarks.filter(b => b.id !== req.params.bookmarkId);
    writeBookmarks(data);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting bookmark:', err);
    res.status(500).json({ error: 'Failed to delete bookmark' });
  }
});

// PATCH update a bookmark
app.patch('/api/bookmarks/categories/:categoryId/bookmarks/:bookmarkId', (req, res) => {
  try {
    const data = readBookmarks();
    const cat = data.categories.find(c => c.id === req.params.categoryId);
    if (!cat) return res.status(404).json({ error: 'Category not found' });
    const bm = cat.bookmarks.find(b => b.id === req.params.bookmarkId);
    if (!bm) return res.status(404).json({ error: 'Bookmark not found' });
    if (req.body.name) bm.name = req.body.name;
    if (req.body.url) bm.url = req.body.url;
    if (req.body.icon) bm.icon = req.body.icon;
    if (req.body.color) bm.color = req.body.color;
    writeBookmarks(data);
    res.json({ success: true, bookmark: bm });
  } catch (err) {
    console.error('Error updating bookmark:', err);
    res.status(500).json({ error: 'Failed to update bookmark' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// ===== GOOGLE SUGGEST PROXY =====
app.get('/api/suggest', async (req, res) => {
  const q = req.query.q;
  if (!q) return res.json([]);
  try {
    const url = `http://suggestqueries.google.com/complete/search?client=firefox&hl=ko&q=${encodeURIComponent(q)}`;
    const response = await new Promise((resolve, reject) => {
      const http = require('http');
      http.get(url, (resp) => {
        let data = '';
        resp.on('data', chunk => data += chunk);
        resp.on('end', () => resolve(data));
      }).on('error', reject);
    });
    const parsed = JSON.parse(response);
    res.json(parsed[1] || []);
  } catch (err) {
    console.error('Google suggest error:', err.message);
    res.json([]);
  }
});
const TODOS_FILE = path.join(BOOKMARKS_DIR, 'todos.json');

const DEFAULT_TODOS = { todos: [] };

function readTodos() {
  try {
    ensureDir(BOOKMARKS_DIR);
    if (!fs.existsSync(TODOS_FILE)) {
      fs.writeFileSync(TODOS_FILE, JSON.stringify(DEFAULT_TODOS, null, 2));
      return DEFAULT_TODOS;
    }
    return JSON.parse(fs.readFileSync(TODOS_FILE, 'utf8'));
  } catch (err) {
    console.error('Error reading todos:', err);
    return DEFAULT_TODOS;
  }
}

function writeTodos(data) {
  ensureDir(BOOKMARKS_DIR);
  fs.writeFileSync(TODOS_FILE, JSON.stringify(data, null, 2));
}

// GET all todos
app.get('/api/todos', (req, res) => {
  try {
    res.json(readTodos());
  } catch (err) {
    res.status(500).json({ error: 'Failed to read todos' });
  }
});

// POST add todo
app.post('/api/todos', (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ error: 'text required' });
    const data = readTodos();
    const todo = {
      id: `todo-${Date.now()}`,
      text: text.trim(),
      completed: false,
      createdAt: new Date().toISOString(),
    };
    data.todos.push(todo);
    writeTodos(data);
    res.json({ success: true, todo });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add todo' });
  }
});

// PATCH toggle/update todo
app.patch('/api/todos/:id', (req, res) => {
  try {
    const data = readTodos();
    const todo = data.todos.find(t => t.id === req.params.id);
    if (!todo) return res.status(404).json({ error: 'Todo not found' });
    if (req.body.completed !== undefined) todo.completed = req.body.completed;
    if (req.body.text !== undefined) todo.text = req.body.text;
    writeTodos(data);
    res.json({ success: true, todo });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update todo' });
  }
});

// DELETE todo
app.delete('/api/todos/:id', (req, res) => {
  try {
    const data = readTodos();
    data.todos = data.todos.filter(t => t.id !== req.params.id);
    writeTodos(data);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete todo' });
  }
});

// DELETE completed todos
app.delete('/api/todos', (req, res) => {
  try {
    const data = readTodos();
    data.todos = data.todos.filter(t => !t.completed);
    writeTodos(data);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to clear completed' });
  }
});

// ===== NOTES API =====
const NOTES_FILE = path.join(BOOKMARKS_DIR, 'notes.json');

const DEFAULT_NOTES = { notes: [] };

function readNotes() {
  try {
    ensureDir(BOOKMARKS_DIR);
    if (!fs.existsSync(NOTES_FILE)) {
      fs.writeFileSync(NOTES_FILE, JSON.stringify(DEFAULT_NOTES, null, 2));
      return DEFAULT_NOTES;
    }
    return JSON.parse(fs.readFileSync(NOTES_FILE, 'utf8'));
  } catch (err) {
    console.error('Error reading notes:', err);
    return DEFAULT_NOTES;
  }
}

function writeNotes(data) {
  ensureDir(BOOKMARKS_DIR);
  fs.writeFileSync(NOTES_FILE, JSON.stringify(data, null, 2));
}

// GET all notes
app.get('/api/notes', (req, res) => {
  try {
    res.json(readNotes());
  } catch (err) {
    res.status(500).json({ error: 'Failed to read notes' });
  }
});

// POST create note
app.post('/api/notes', (req, res) => {
  try {
    const data = readNotes();
    const note = {
      id: `note-${Date.now()}`,
      content: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    data.notes.unshift(note);
    writeNotes(data);
    res.json({ success: true, note });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create note' });
  }
});

// PATCH update note content
app.patch('/api/notes/:id', (req, res) => {
  try {
    const data = readNotes();
    const note = data.notes.find(n => n.id === req.params.id);
    if (!note) return res.status(404).json({ error: 'Note not found' });
    if (req.body.content !== undefined) note.content = req.body.content;
    note.updatedAt = new Date().toISOString();
    writeNotes(data);
    res.json({ success: true, note });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update note' });
  }
});

// DELETE note
app.delete('/api/notes/:id', (req, res) => {
  try {
    const data = readNotes();
    data.notes = data.notes.filter(n => n.id !== req.params.id);
    writeNotes(data);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
  console.log(`Running in cluster: ${isInCluster}`);
  console.log(`Bookmarks file: ${BOOKMARKS_FILE}`);
});
