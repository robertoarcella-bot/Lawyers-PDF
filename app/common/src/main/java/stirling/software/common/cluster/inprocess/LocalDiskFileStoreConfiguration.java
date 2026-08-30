package stirling.software.common.cluster.inprocess;

import java.io.File;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import stirling.software.common.cluster.FileStore;

/**
 * Always-on wiring for the per-node local-disk {@link FileStore}. Active when {@code
 * cluster.artifactStore=local} (the default; {@code matchIfMissing=true}). The S3 artifact-store
 * supplies its own bean when {@code cluster.artifactStore=s3}.
 */
@Configuration
@ConditionalOnProperty(
        prefix = "cluster",
        name = "artifactStore",
        havingValue = "local",
        matchIfMissing = true)
public class LocalDiskFileStoreConfiguration {

    @Bean
    @ConditionalOnMissingBean
    public FileStore fileStore(@Value("${stirling.tempDir:}") String tempDir) {
        return new LocalDiskFileStore(
                tempDir == null || tempDir.isBlank() ? defaultStoreDirectory() : tempDir);
    }

    /**
     * The system temporary directory, not a hard-coded {@code /tmp}.
     *
     * <p>A leading slash means "the root of the current drive" on Windows, so the store used to
     * land in {@code C:\tmp} - or fail outright, when the program had been started from a folder on
     * a virtual drive such as a cloud-sync mount, whose root refuses new directories. Every job
     * that stages a file through the store died there with a 500.
     */
    private static String defaultStoreDirectory() {
        return new File(System.getProperty("java.io.tmpdir"), "stirling-files").getPath();
    }
}
