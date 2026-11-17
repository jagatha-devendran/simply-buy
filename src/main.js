import { mount } from 'svelte';
import './app.css';
import App from './App.svelte';
import { installLinkHandler } from './lib/router.js';

installLinkHandler();

export default mount(App, { target: document.getElementById('app') });
