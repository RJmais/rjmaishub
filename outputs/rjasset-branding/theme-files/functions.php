<?php
/**
 * RJ+ Asset Institutional theme bootstrap.
 */

if (!defined('ABSPATH')) {
    exit;
}

function rjasset_setup(): void
{
    add_theme_support('title-tag');
    add_theme_support('post-thumbnails');
    add_theme_support('html5', ['search-form', 'gallery', 'caption', 'style', 'script']);

    register_nav_menus([
        'primary' => __('Menu principal', 'rjasset'),
        'footer' => __('Menu rodapé', 'rjasset'),
    ]);
}
add_action('after_setup_theme', 'rjasset_setup');

function rjasset_assets(): void
{
    wp_enqueue_style(
        'rjasset-fonts',
        'https://fonts.googleapis.com/css2?family=Fahkwang:wght@400;500;600&display=swap',
        [],
        null
    );

    wp_enqueue_style(
        'rjasset-style',
        get_template_directory_uri() . '/assets/css/rjasset.css',
        [],
        '0.1.0'
    );

    wp_enqueue_script(
        'rjasset-script',
        get_template_directory_uri() . '/assets/js/rjasset.js',
        [],
        '0.1.0',
        true
    );
}
add_action('wp_enqueue_scripts', 'rjasset_assets');

function rjasset_field(string $name, $fallback = '')
{
    if (function_exists('get_field')) {
        $value = get_field($name);
        if ($value !== null && $value !== false && $value !== '') {
            return $value;
        }

        $option_value = get_field($name, 'option');
        if ($option_value !== null && $option_value !== false && $option_value !== '') {
            return $option_value;
        }
    }

    return $fallback;
}

function rjasset_default_policies(): array
{
    return [
        [
            'title' => 'Manual de Compliance',
            'category' => 'Compliance',
            'url' => home_url('/wp-content/uploads/2026/06/manual-de-compliance.pdf'),
            'note' => 'Documento em PDF.',
        ],
        [
            'title' => 'Formulário de Referência',
            'category' => 'Referência CVM',
            'url' => 'https://cvmweb.cvm.gov.br/SWB/Sistemas/SCW/CPublica/FormRefAdmCart/ConsultaFormReferenciaAdmCarteiraPJ.aspx?PK_PARTIC=122183&COMPTC=2024',
            'note' => 'Consulta pública no site da CVM.',
        ],
        [
            'title' => 'Política de Rateio e Divisão de Ordens',
            'category' => 'Ordens',
            'url' => home_url('/wp-content/uploads/2026/06/politica-rateio-divisao-ordens.pdf'),
            'note' => 'Documento em PDF.',
        ],
        [
            'title' => 'Política de Gestão de Risco',
            'category' => 'Risco',
            'url' => home_url('/wp-content/uploads/2026/06/politica-gestao-risco.pdf'),
            'note' => 'Documento em PDF.',
        ],
    ];
}

function rjasset_get_policies(): array
{
    if (function_exists('get_field')) {
        $rows = get_field('rjasset_policies');
        if (is_array($rows) && $rows) {
            return array_map(static function ($row) {
                $file = $row['policy_file'] ?? '';
                $url = is_array($file) && isset($file['url']) ? $file['url'] : ($row['policy_url'] ?? '');

                return [
                    'title' => $row['policy_title'] ?? '',
                    'category' => $row['policy_category'] ?? '',
                    'url' => $url,
                    'note' => $row['policy_note'] ?? '',
                ];
            }, $rows);
        }
    }

    return rjasset_default_policies();
}

function rjasset_register_acf_options(): void
{
    if (function_exists('acf_add_options_page')) {
        acf_add_options_page([
            'page_title' => 'RJ+ Asset',
            'menu_title' => 'RJ+ Asset',
            'menu_slug' => 'rjasset-options',
            'capability' => 'edit_posts',
            'redirect' => false,
        ]);
    }
}
add_action('acf/init', 'rjasset_register_acf_options');

function rjasset_schema(): void
{
    if (!is_front_page()) {
        return;
    }

    $site_url = home_url('/');
    $logo = rjasset_field('logo_header', '');
    $logo_url = is_array($logo) && !empty($logo['url']) ? $logo['url'] : '';

    $schema = [
        '@context' => 'https://schema.org',
        '@graph' => [
            [
                '@type' => 'Organization',
                '@id' => $site_url . '#organization',
                'name' => 'RJ+ Asset',
                'url' => $site_url,
                'description' => 'Gestora de recursos independente, especializada em fundos estruturados e gestão de patrimônio.',
                'email' => 'atendimento@rjasset.com.br',
            ],
            [
                '@type' => 'WebSite',
                '@id' => $site_url . '#website',
                'url' => $site_url,
                'name' => 'RJ+ Asset',
                'publisher' => [
                    '@id' => $site_url . '#organization',
                ],
                'inLanguage' => 'pt-BR',
            ],
            [
                '@type' => 'WebPage',
                '@id' => $site_url . '#webpage',
                'url' => $site_url,
                'name' => 'RJ+ Asset | Gestão de recursos com método e disciplina',
                'isPartOf' => [
                    '@id' => $site_url . '#website',
                ],
                'about' => [
                    '@id' => $site_url . '#organization',
                ],
                'inLanguage' => 'pt-BR',
            ],
        ],
    ];

    if ($logo_url) {
        $schema['@graph'][0]['logo'] = esc_url_raw($logo_url);
    }

    echo '<script type="application/ld+json">' . wp_json_encode($schema, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . '</script>' . "\n";
}
add_action('wp_head', 'rjasset_schema');

function rjasset_document_title_parts(array $title): array
{
    if (is_front_page()) {
        $title['title'] = 'RJ+ Asset | Gestão de recursos com método e disciplina';
    }

    return $title;
}
add_filter('document_title_parts', 'rjasset_document_title_parts');
