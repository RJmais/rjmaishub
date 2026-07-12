<?php
if (!defined('ABSPATH')) {
    exit;
}

get_header();
?>
<section class="rjasset-section rjasset-section--paper rjasset-default-page">
    <div class="rjasset-container">
        <p class="rjasset-eyebrow">Página não encontrada</p>
        <h1>Conteúdo não encontrado</h1>
        <p>A página solicitada não foi localizada. Use os links abaixo para voltar aos principais conteúdos da RJ+ Asset.</p>
        <div class="rjasset-actions">
            <a class="rjasset-button rjasset-button--primary" href="<?php echo esc_url(home_url('/')); ?>">Voltar para a home</a>
            <a class="rjasset-button rjasset-button--secondary" href="<?php echo esc_url(home_url('/#politicas-da-gestora')); ?>">Políticas da Gestora</a>
        </div>
    </div>
</section>
<?php
get_footer();
