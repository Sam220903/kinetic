import routinesService from '../api/services/routines.js';


const routines = routinesService.get();

console.log(routines);
