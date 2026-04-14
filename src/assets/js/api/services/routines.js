import apiClient from "../apiClient.js";

const ENDPOINT = 'routines';

const routinesService = {
    get: () => {
        return apiClient.get(ENDPOINT);
    },

    getbyID: (id) => {
        return apiClient.get(`${ENDPOINT}/${id}`);
    },
}

export default routinesService;