<?php
if (!defined('ABSPATH')) {
    exit;
}
?><!doctype html>
<html <?php language_attributes(); ?>>
<head>
    <meta charset="<?php bloginfo('charset'); ?>">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <?php wp_head(); ?>
</head>
<body <?php body_class('rjasset-body'); ?>>
<?php wp_body_open(); ?>
<a class="rjasset-skip-link" href="#conteudo">Pular para o conteúdo</a>
<header class="rjasset-header" role="banner">
    <div class="rjasset-header__inner">
        <a class="rjasset-logo" href="<?php echo esc_url(home_url('/')); ?>" aria-label="RJ+ Asset - Início">
            <?php
            $logo = rjasset_field('logo_header', '');
            if (is_array($logo) && !empty($logo['url'])) :
                ?>
                <img src="<?php echo esc_url($logo['url']); ?>" alt="RJ+ Asset">
            <?php else : ?>
                <?php
                $fallback_logo = wp_get_attachment_image(22, 'large', false, ['alt' => 'RJ+ Asset']);
                if ($fallback_logo) {
                    echo $fallback_logo;
                } else {
                    echo '<span>RJ+ Asset</span>';
                }
                ?>
            <?php endif; ?>
        </a>
        <nav class="rjasset-nav" aria-label="Menu principal">
            <?php
            if (has_nav_menu('primary')) {
                wp_nav_menu([
                    'theme_location' => 'primary',
                    'container' => false,
                    'menu_class' => 'rjasset-nav__list',
                    'fallback_cb' => false,
                ]);
            } else {
                ?>
                <ul class="rjasset-nav__list">
                    <li><a href="#quem-somos">Quem Somos</a></li>
                    <li><a href="#gestora-independente">Gestora independente</a></li>
                    <li><a href="#contato">Contato</a></li>
                    <li><a href="#politicas-da-gestora">Políticas</a></li>
                </ul>
                <?php
            }
            ?>
        </nav>
        <a class="rjasset-header__cta" href="#contato">Falar com a RJ+ Asset</a>
    </div>
</header>
<main id="conteudo" class="rjasset-main">
