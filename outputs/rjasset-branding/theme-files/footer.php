<?php
if (!defined('ABSPATH')) {
    exit;
}
?>
</main>
<footer class="rjasset-footer" role="contentinfo">
    <div class="rjasset-footer__inner">
        <div>
            <strong>RJ+ Asset</strong>
            <p>RJ+ Asset | RJ Gestão de Recursos Ltda</p>
            <p><a href="mailto:atendimento@rjasset.com.br">atendimento@rjasset.com.br</a></p>
        </div>
        <nav aria-label="Links do rodapé">
            <a href="<?php echo esc_url(home_url('/#quem-somos')); ?>">Quem Somos</a>
            <a href="<?php echo esc_url(home_url('/#politicas-da-gestora')); ?>">Políticas da Gestora</a>
            <a href="<?php echo esc_url(home_url('/politica-de-privacidade/')); ?>">Política de Privacidade</a>
            <a href="<?php echo esc_url(home_url('/termos-de-uso/')); ?>">Termos de Uso</a>
        </nav>
        <p class="rjasset-footer__legal">
            Este site tem finalidade institucional e informativa. As informações aqui apresentadas não constituem oferta, recomendação individualizada, promessa de rentabilidade ou consultoria de investimento. Investimentos envolvem riscos e podem causar perdas. Rentabilidade passada não garante rentabilidade futura.
        </p>
    </div>
</footer>
<?php wp_footer(); ?>
</body>
</html>
