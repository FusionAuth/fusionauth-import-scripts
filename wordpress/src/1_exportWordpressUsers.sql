SELECT
    -- u.ID,
    JSON_OBJECT(
        'ID', u.ID,
        'user_login', u.user_login,
        'user_pass', u.user_pass,
        'user_nicename', u.user_nicename,
        'user_email', u.user_email,
        'user_url', u.user_url,
        'user_registered', u.user_registered,
        'user_activation_key', u.user_activation_key,
        'user_status', u.user_status,
        'display_name', u.display_name,
        'meta', COALESCE(meta_data.meta_json, JSON_ARRAY())
    ) AS json_result
FROM
    wp_users AS u
    LEFT JOIN
    (
        SELECT
            user_id,
            JSON_ARRAYAGG(JSON_OBJECT('meta_key', meta_key, 'meta_value', meta_value)) AS meta_json
        FROM
            wp_usermeta
        WHERE
            meta_value IS NOT NULL AND
            meta_value <> ''
        GROUP BY
            user_id
    ) AS meta_data
        ON u.ID = meta_data.user_id;