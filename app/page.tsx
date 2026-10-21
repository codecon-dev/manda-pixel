import HomeClient from './components/HomeClient';
import { parseFocus } from './lib/focus';

type HomeProps = {
  searchParams: { [key: string]: string | string[] | undefined };
};

export default function Home({ searchParams }: HomeProps) {
  return <HomeClient focus={parseFocus(searchParams.x, searchParams.y)} />;
}
