const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const axios = require('axios');
const session = require('express-session');
const WebSocket = require('ws');

const app = express();
const PORT = 3000;
const WS_PORT = 3001; // ใช้พอร์ตแยกสำหรับ WebSocket

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
    secret: 'tdma',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

app.post('/login', async (req, res) => {
    const { username, password, remember } = req.body;

    try {
        let response = await axios.post('https://api-test-front-end.237solutions.tech/api/auth/login', {
            username: username,
            password: password,
            remember: remember
        });

        if (response.data.status) {
            req.session.user = response.data.data;
            res.redirect('/homepage');
        } else {
            res.status(500).send(response.data);
        }
    } catch (error) {
        res.status(500).send(error.response.data);
    }
});

app.get('/homepage', async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/');
    }

    try {
        let pageSize = (true) ? "?pageSize=20" : "";
        let page = (true) ? "&page=1" : "";
        let search = (false) ? "&search=name" : "";
        let sort = (false) ? "&sort=desc" : "";
        let sortColumn = (false) ? "&sortColumn=id" : "";

        let response = await axios.get(`https://api-test-front-end.237solutions.tech/api/news${pageSize}${page}${search}${sort}${sortColumn}`, {
            headers: {
                'accept': '*/*',
                'Authorization': `Bearer ${req.session.user.auth.accessToken}`
            }
        });
        res.render('homepage', { news: response.data.data.data });
    } catch (error) {
        res.status(500).send(error.response.data);
    }
});

app.get('/profile', async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/');
    }

    try {
        let response = await axios.get('https://api-test-front-end.237solutions.tech/api/auth/profile', {
            headers: {
                'accept': 'application/json',
                'Authorization': `Bearer ${req.session.user.auth.accessToken}`
            }
        });
        res.render('profile', { profile: response.data.data });
    } catch (error) {
        res.status(500).send(error.response.data);
    }
});

app.get('/news/:id', async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/');
    }

    try {
        let response = await axios.get(`https://api-test-front-end.237solutions.tech/api/news/${req.params.id}`, {
            headers: {
                'accept': '*/*',
                'Authorization': `Bearer ${req.session.user.auth.accessToken}`
            }
        });
        res.render('newsDetail', { news: response.data.data });
    } catch (error) {
        res.status(500).send(error.response.data);
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).send(err);
        }

        res.redirect('/');
    });
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

// WebSocket Server
const wss = new WebSocket.Server({ port: WS_PORT });

wss.on('connection', (ws) => {
    console.log('New client connected');

    const sendCurrentTime = () => {
        const currentTime = new Date().toISOString();
        ws.send(JSON.stringify({ event: 'CURRENT_TIME', data: currentTime }));
    };

    const interval = setInterval(sendCurrentTime, 1000);

    ws.on('close', () => {
        console.log('User disconnected');
        clearInterval(interval);
    });

    ws.on('error', (err) => {
        console.error(`User connection error: ${err.message}`);
        clearInterval(interval);
    });
});
