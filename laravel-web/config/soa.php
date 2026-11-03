<?php

return [
    'api_base_url' => env('SOA_API_BASE_URL', 'http://127.0.0.1:3001/api/v1'),
    'local_preview' => env('SOA_LOCAL_PREVIEW', false),
    'local_user_id' => (int) env('SOA_LOCAL_USER_ID', 1),
];
