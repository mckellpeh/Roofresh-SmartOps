import Link from 'next/link';
import Image from 'next/image';
import styles from './Navbar.module.css';

export default function Navbar() {
  return (
    <nav className={styles.navbar}>
      <Link href="/" className={styles.navLink}>
        <Image 
          src="/icons/Logo.png" 
          alt="Roofresh Logo Icon" 
          width={80} 
          height={80} 
          className={styles.logoIcon}
          priority
        />
        <Image 
          src="/icons/Logo title.png" 
          alt="Roofresh Logo Title" 
          width={400} 
          height={100} 
          className={styles.logoTitle}
          priority
        />
      </Link>
    </nav>
  );
}
