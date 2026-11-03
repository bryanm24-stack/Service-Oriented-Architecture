<?php

return [
    // Dana will add a shared Node identity flow; this web layer has no local user database.
    'defaults' => ['guard' => null, 'passwords' => null],
    'guards' => [],
    'providers' => [],
    'passwords' => [],
    'password_timeout' => 10800,
];
